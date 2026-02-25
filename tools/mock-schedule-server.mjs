import http from 'node:http';
import net from 'node:net';

const httpPort = 8080;
const tcpPort = 9090;

const data = [
  {
    externalScheduleId: 'es_1',
    externalSubjectCode: 'MATH101',
    subjectName: 'Математический анализ',
    groupCode: 'CS-101',
    semester: '2026S1',
    teacherExternalId: 't_77',
    teacherName: 'Петров П.П.',
    startsAt: '2026-03-01T09:00:00Z',
    endsAt: '2026-03-01T10:30:00Z',
    room: 'A-301'
  },
  {
    externalScheduleId: 'es_2',
    externalSubjectCode: 'PHY101',
    subjectName: 'Физика',
    groupCode: 'CS-101',
    semester: '2026S1',
    teacherExternalId: 't_80',
    teacherName: 'Сидоров С.С.',
    startsAt: '2026-03-02T11:00:00Z',
    endsAt: '2026-03-02T12:30:00Z',
    room: 'B-107'
  }
];

const filterData = ({ groupCode, semester, teacherExternalId }) =>
  data.filter((row) => {
    if (groupCode && row.groupCode !== groupCode) return false;
    if (semester && row.semester !== semester) return false;
    if (teacherExternalId && row.teacherExternalId !== teacherExternalId) return false;
    return true;
  });

const httpServer = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/schedule') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const payload = body ? JSON.parse(body) : {};
    const items = filterData(payload);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ items }));
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

httpServer.listen(httpPort, () => {
  console.log(`Mock HTTP schedule server on :${httpPort}`);
});

const tcpServer = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    const line = chunk.toString('utf8').trim();
    let payload = {};
    try {
      payload = JSON.parse(line);
    } catch {
      socket.write(`${JSON.stringify({ status: 'ERROR', reason: 'invalid_json' })}\n`);
      return;
    }

    const items = filterData(payload);
    socket.write(`${JSON.stringify({ requestId: payload.requestId, status: 'OK', items })}\n`);
  });
});

tcpServer.listen(tcpPort, () => {
  console.log(`Mock TCP schedule server on :${tcpPort}`);
});
