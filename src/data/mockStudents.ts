export type PlotStatus =
  | 'idle'
  | 'writing'
  | 'thinking'
  | 'running'
  | 'success'
  | 'failed'
  | 'hint_used'
  | 'awaiting';

export interface Student {
  id: string;
  alias: string;
  score: number;
  piecesUnlocked: number;
  status: 'connected' | 'disconnected' | 'coding';
  plotStatus?: PlotStatus;
  avatarColor: string;
}

export const mockStudents: Student[] = [
  { id: 's1',  alias: 'StarCoder',  score: 80, piecesUnlocked: 4, status: 'connected',    avatarColor: '#3DD8FF' },
  { id: 's2',  alias: 'PixelWiz',   score: 60, piecesUnlocked: 3, status: 'coding',       avatarColor: '#42FF7B' },
  { id: 's3',  alias: 'NebulaNick', score: 50, piecesUnlocked: 2, status: 'connected',    avatarColor: '#FF6BB5' },
  { id: 's4',  alias: 'ZeroGZoe',   score: 40, piecesUnlocked: 2, status: 'connected',    avatarColor: '#FFB347' },
  { id: 's5',  alias: 'ByteRider',  score: 30, piecesUnlocked: 1, status: 'disconnected', avatarColor: '#FFE34D' },
  { id: 's6',  alias: 'CodeNova',   score: 20, piecesUnlocked: 1, status: 'connected',    avatarColor: '#B366FF' },
  { id: 's7',  alias: 'AstroAlex',  score: 70, piecesUnlocked: 3, status: 'coding',       avatarColor: '#FF5C5C' },
  { id: 's8',  alias: 'QubitQuin',  score: 55, piecesUnlocked: 3, status: 'connected',    avatarColor: '#3DD8FF' },
  { id: 's9',  alias: 'LaserLena',  score: 45, piecesUnlocked: 2, status: 'connected',    avatarColor: '#42FF7B' },
  { id: 's10', alias: 'VoidVince',  score: 35, piecesUnlocked: 1, status: 'coding',       avatarColor: '#FFB347' },
  { id: 's11', alias: 'NanoNia',    score: 25, piecesUnlocked: 1, status: 'connected',    avatarColor: '#FF6BB5' },
  { id: 's12', alias: 'OrbitalOli', score: 10, piecesUnlocked: 0, status: 'disconnected', avatarColor: '#FFE34D' },
];
