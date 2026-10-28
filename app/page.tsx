import Dashboard from './ui/dashboard';
import rows from '@/lib/derechohabientes.json';
export default function Home() { return <Dashboard curp={rows[0].curp} />; }
