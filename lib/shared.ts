export const normalize = (name: string) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
export const missions = [
  { numero: 1, titulo: 'Consulta un derechohabiente', como: 'GET /api/derechohabientes/{curp} → 200' },
  { numero: 2, titulo: 'Provoca un 404', como: 'GET /api/derechohabientes/XXXX000000HXXXXX00 → 404' },
  { numero: 3, titulo: 'Agenda una cita con JSON', como: 'POST /api/citas · JSON completo → 201' },
  { numero: 4, titulo: 'Envía un JSON mal escrito', como: 'POST /api/citas · JSON roto → 400' },
  { numero: 5, titulo: 'Entra a la zona protegida', como: 'GET /api/protegido · Bearer clinica123 → 200' },
];
export type RequestEntry = { id: string; fecha: string; metodo: string; ruta: string; estado: number; duracion: number; participante: string; codigo?: string; mision?: number; respuesta: string };
