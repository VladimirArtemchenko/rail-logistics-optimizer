import type { WorkSheet } from 'xlsx';

import type {
  AppData,
  Capability,
  Front,
  PlanRow,
  RouteNorm,
} from '@/types/domain';

type XlsxModule = typeof import('xlsx');

const REQUIRED_SHEETS = [
  'Календарный график',
  'Фронты',
  'Грузы по фронтам',
  'Нормы маршрутов',
] as const;

const REQUIRED_HEADERS: Record<(typeof REQUIRED_SHEETS)[number], string[]> = {
  'Календарный график': [
    'ID строки',
    'Дата',
    'Регион назначения',
    'Станция назначения',
    'Код груза',
    'Код фронта',
    'Количество вагонов',
  ],
  Фронты: [
    'Код фронта',
    'Наименование',
    'Вместимость одной постановки',
    'Суточная производительность',
  ],
  'Грузы по фронтам': ['Код фронта', 'Код груза'],
  'Нормы маршрутов': ['Регион назначения', 'Норма'],
};

let xlsxPromise: Promise<XlsxModule> | undefined;

export class WorkbookImportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WorkbookImportError';
  }
}

async function loadXlsx(): Promise<XlsxModule> {
  if (typeof window === 'undefined') {
    throw new WorkbookImportError(
      'Обработка Excel доступна только в браузере.',
    );
  }

  xlsxPromise ??= import('xlsx').catch((error: unknown) => {
    xlsxPromise = undefined;
    throw new WorkbookImportError(
      'Не удалось загрузить модуль Excel. Обновите страницу и попробуйте снова.',
      { cause: error },
    );
  });

  return xlsxPromise;
}

const str = (value: unknown) => String(value ?? '').trim();
const num = (value: unknown) => Number(value);

export async function importWorkbook(file: File): Promise<AppData> {
  if (!/\.xlsx?$/i.test(file.name)) {
    throw new WorkbookImportError('Выберите файл Excel в формате .xlsx или .xls.');
  }
  if (file.size === 0) {
    throw new WorkbookImportError('Выбранный файл пуст.');
  }

  try {
    const XLSX = await loadXlsx();
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
      cellDates: true,
    });

    validateWorkbookStructure(XLSX, workbook.Sheets);

    const sheet = (name: (typeof REQUIRED_SHEETS)[number]) =>
      XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name]!, {
        defval: '',
      });

    const rows: PlanRow[] = sheet('Календарный график').map((row, index) => {
      const recipient = str(row['Получатель']);
      const cargoName = str(row['Наименование груза']);
      return {
        id: str(row['ID строки'] || index + 1),
        date: toISO(row['Дата']),
        region: str(row['Регион назначения']),
        station: str(row['Станция назначения']),
        cargoCode: str(row['Код груза']),
        frontCode: str(row['Код фронта']),
        wagons: num(row['Количество вагонов']),
        ...(recipient ? { recipient } : {}),
        ...(cargoName ? { cargoName } : {}),
      };
    });
    const fronts: Front[] = sheet('Фронты').map((row) => ({
      code: str(row['Код фронта']),
      name: str(row['Наименование']),
      placementCapacity: num(row['Вместимость одной постановки']),
      dailyCapacity: num(row['Суточная производительность']),
    }));
    const capabilities: Capability[] = sheet('Грузы по фронтам').map((row) => ({
      frontCode: str(row['Код фронта']),
      cargoCode: str(row['Код груза']),
    }));
    const normRows = sheet('Нормы маршрутов');
    const norms: RouteNorm[] = normRows
      .filter((row) => str(row['Регион назначения']) !== 'DEFAULT')
      .map((row) => ({
        region: str(row['Регион назначения']),
        norm: num(row['Норма']),
      }));
    const defaultNorm = normRows.find(
      (row) => str(row['Регион назначения']) === 'DEFAULT',
    );
    const period = rows[0]?.date.slice(0, 7);

    return {
      rows,
      fronts,
      capabilities,
      norms,
      settings: {
        backDays: 2,
        forwardDays: 2,
        defaultNorm: num(defaultNorm?.['Норма'] || 72),
      },
      fileName: file.name,
      ...(period ? { period } : {}),
    };
  } catch (error) {
    if (error instanceof WorkbookImportError) throw error;
    throw new WorkbookImportError(
      'Не удалось прочитать Excel-файл. Проверьте, что файл не повреждён и соответствует шаблону.',
      { cause: error },
    );
  }
}

function validateWorkbookStructure(
  XLSX: XlsxModule,
  sheets: Partial<Record<string, WorkSheet>>,
) {
  const missingSheets = REQUIRED_SHEETS.filter((name) => !sheets[name]);
  if (missingSheets.length) {
    throw new WorkbookImportError(
      `Отсутствуют обязательные листы: ${missingSheets.join(', ')}.`,
    );
  }

  for (const name of REQUIRED_SHEETS) {
    const [headerRow = []] = XLSX.utils.sheet_to_json<unknown[]>(sheets[name]!, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    const headers = new Set(headerRow.map(str));
    const missingHeaders = REQUIRED_HEADERS[name].filter(
      (header) => !headers.has(header),
    );
    if (missingHeaders.length) {
      throw new WorkbookImportError(
        `Лист «${name}»: отсутствуют столбцы ${missingHeaders.join(', ')}.`,
      );
    }
  }
}

function toISO(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = str(value);
  const match = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  return match
    ? `${match[3]}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}`
    : raw.slice(0, 10);
}

export async function exportResult(data: AppData) {
  const result = data.result;
  if (!result) return;

  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(result.routes),
    'Маршруты',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(result.potentialRoutes),
    'Потенциальные',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(result.movements),
    'Перемещения',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(result.remainders),
    'Остатки',
  );
  XLSX.writeFile(workbook, `optimized-${data.period ?? 'plan'}.xlsx`);
}
