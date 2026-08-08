'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';

import { exportResult, importWorkbook } from '@/excel/io';
import { optimizerClient } from '@/optimizer/client';
import {
  loadData,
  reset,
  setResult,
  setSettings,
} from '@/store/store';
import type { RootState } from '@/store/store';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export default function Dashboard() {
  const data = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  async function upload(file: File) {
    setImporting(true);
    setErrors([]);
    try {
      const importedData = await importWorkbook(file);
      dispatch(loadData(importedData));
    } catch (error) {
      setErrors([errorMessage(error)]);
    } finally {
      setImporting(false);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void upload(file);
  }

  async function run() {
    setBusy(true);
    setErrors([]);
    let client: ReturnType<typeof optimizerClient> | undefined;
    try {
      client = optimizerClient();
      const validationErrors = await client.api.validate(data);
      if (validationErrors.length) {
        setErrors(validationErrors);
        return;
      }
      const result = await client.api.optimize(data);
      dispatch(setResult(result));
    } catch (error) {
      setErrors([errorMessage(error)]);
    } finally {
      client?.terminate();
      setBusy(false);
    }
  }

  async function download() {
    setErrors([]);
    try {
      await exportResult(data);
    } catch (error) {
      setErrors([errorMessage(error)]);
    }
  }

  const stats = data.result?.stats;
  const isWorking = busy || importing;

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            RailRoute Optimizer
          </Typography>
          <Chip label="Frontend-only" color="secondary" />
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Оптимизация железнодорожной погрузки
            </Typography>
            <Typography color="text.secondary">
              Маршрутизация вагонов, переносы по датам и фронтам — расчёт
              выполняется локально в браузере.
            </Typography>
          </Box>
          <Paper sx={{ p: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems="center"
            >
              <Button
                component="label"
                variant="contained"
                disabled={isWorking}
                startIcon={<UploadFileIcon />}
              >
                {importing ? 'Импорт…' : 'Загрузить Excel'}
                <input
                  hidden
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={selectFile}
                />
              </Button>
              <TextField
                label="Перенос назад, суток"
                type="number"
                size="small"
                value={data.settings.backDays}
                onChange={(event) =>
                  dispatch(setSettings({ backDays: +event.target.value }))
                }
              />
              <TextField
                label="Перенос вперёд, суток"
                type="number"
                size="small"
                value={data.settings.forwardDays}
                onChange={(event) =>
                  dispatch(setSettings({ forwardDays: +event.target.value }))
                }
              />
              <Button
                variant="contained"
                color="success"
                disabled={!data.rows.length || isWorking}
                startIcon={<PlayArrowIcon />}
                onClick={() => void run()}
              >
                Оптимизировать
              </Button>
              {data.result && (
                <Button
                  disabled={isWorking}
                  startIcon={<DownloadIcon />}
                  onClick={() => void download()}
                >
                  Экспорт Excel
                </Button>
              )}
            </Stack>
            {isWorking && <LinearProgress sx={{ mt: 2 }} />}
            {data.fileName && (
              <Typography sx={{ mt: 2 }} color="text.secondary">
                {data.fileName} · {data.period} · {data.rows.length} строк ·{' '}
                {data.rows.reduce((sum, row) => sum + row.wagons, 0)} вагонов
              </Typography>
            )}
          </Paper>
          {errors.map((error, index) => (
            <Alert severity="error" key={`${index}-${error}`}>
              {error}
            </Alert>
          ))}
          {stats && (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
                  gap: 2,
                }}
              >
                {[
                  ['Всего вагонов', stats.total],
                  ['Готовых маршрутов', stats.readyRoutes],
                  ['Новых маршрутов', stats.newRoutes],
                  ['Маршрутных вагонов', stats.routedAfter],
                  ['Перенесено вагонов', stats.movedWagons],
                  ['Остаток', stats.total - stats.routedAfter],
                ].map(([label, value]) => (
                  <Card key={String(label)}>
                    <CardContent>
                      <Typography color="text.secondary">{label}</Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {value}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Сформированные маршруты
                </Typography>
                <Box sx={{ overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {[
                          '№',
                          'Дата',
                          'Регион',
                          'Фронт',
                          'Вагонов',
                          'Постановок',
                          'Источник',
                        ].map((heading) => (
                          <th
                            style={{
                              textAlign: 'left',
                              padding: 10,
                              borderBottom: '1px solid #ddd',
                            }}
                            key={heading}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.result!.routes.map((route) => (
                        <tr key={route.id}>
                          <td style={{ padding: 10 }}>{route.id}</td>
                          <td>{route.date}</td>
                          <td>{route.region}</td>
                          <td>{route.frontCode}</td>
                          <td>{route.wagons}</td>
                          <td>{route.placements}</td>
                          <td>
                            <Chip
                              size="small"
                              label={
                                route.source === 'INITIAL'
                                  ? 'Готовый'
                                  : 'Оптимизирован'
                              }
                              color={
                                route.source === 'INITIAL'
                                  ? 'default'
                                  : 'success'
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </>
          )}
          <Button color="inherit" onClick={() => dispatch(reset())}>
            Очистить данные
          </Button>
        </Stack>
      </Container>
    </>
  );
}
