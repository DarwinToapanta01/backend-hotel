// Script para poblar la base de datos con datos iniciales

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({ adapter });

const habitaciones = [
  { numero: '101', tipo: 'SIMPLE', precioPorNoche: 45.00, capacidad: 1, descripcion: 'Habitación simple con vista al jardín', amenidades: ['WiFi', 'TV', 'Aire acondicionado'] },
  { numero: '102', tipo: 'DOBLE', precioPorNoche: 85.00, capacidad: 2, descripcion: 'Habitación doble con balcón y vista al jardín', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Balcón'] },
  { numero: '103', tipo: 'SIMPLE', precioPorNoche: 40.00, capacidad: 1, descripcion: 'Habitación simple económica, ideal para viajeros', amenidades: ['WiFi', 'TV'] },
  { numero: '104', tipo: 'FAMILIAR', precioPorNoche: 150.00, capacidad: 6, descripcion: 'Habitación familiar amplia con dos camas dobles', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Nevera', 'Sofá cama'] },
  { numero: '201', tipo: 'DOBLE', precioPorNoche: 75.00, capacidad: 2, descripcion: 'Habitación doble con vista a la piscina', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar'] },
  { numero: '202', tipo: 'SUITE', precioPorNoche: 200.00, capacidad: 2, descripcion: 'Suite presidencial con sala de estar y jacuzzi', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Jacuzzi', 'Sala de estar', 'Desayuno incluido', 'Minibar'] },
  { numero: '203', tipo: 'DOBLE', precioPorNoche: 90.00, capacidad: 3, descripcion: 'Habitación doble con cama extra, vista a la piscina', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Vista piscina'] },
  { numero: '204', tipo: 'SIMPLE', precioPorNoche: 42.00, capacidad: 1, descripcion: 'Habitación simple con escritorio para trabajo', amenidades: ['WiFi', 'TV', 'Escritorio', 'Cafetera'] },
  { numero: '301', tipo: 'SUITE', precioPorNoche: 120.00, capacidad: 4, descripcion: 'Suite de lujo con jacuzzi', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Jacuzzi', 'Desayuno incluido'] },
  { numero: '302', tipo: 'FAMILIAR', precioPorNoche: 180.00, capacidad: 5, descripcion: 'Habitación familiar de lujo con área de juegos', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Nevera', 'Área de juegos', 'Bañera'] },
  { numero: '303', tipo: 'DOBLE', precioPorNoche: 95.00, capacidad: 2, descripcion: 'Habitación doble romántica con vista a la montaña', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Vista montaña', 'Bañera'] },
  { numero: '304', tipo: 'SUITE', precioPorNoche: 175.00, capacidad: 3, descripcion: 'Suite junior con sala de estar y terraza privada', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Terraza', 'Minibar', 'Desayuno incluido'] },
  { numero: '401', tipo: 'SUITE', precioPorNoche: 250.00, capacidad: 4, descripcion: 'Suite penthouse con vista panorámica de la ciudad', amenidades: ['WiFi', 'TV', 'Aire acondicionado', 'Vista panorámica', 'Jacuzzi', 'Cocina equipada', 'Desayuno incluido', 'Butler service'] },
];

async function main() {
  console.log('🌱 Iniciando seed...');

  // Crear usuario admin si no existe
  const adminExiste = await prisma.usuario.findUnique({
    where: { email: 'admin@hotelbot.com' },
  });

  if (!adminExiste) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@hotelbot.com',
        password: passwordHash,
        rol: 'ADMIN',
      },
    });
    console.log('✅ Usuario admin creado');
  } else {
    console.log('⏭️  Usuario admin ya existe');
  }

  // Crear usuario cliente de prueba
  const clienteExiste = await prisma.usuario.findUnique({
    where: { email: 'cliente@hotelbot.com' },
  });

  if (!clienteExiste) {
    const passwordHash = await bcrypt.hash('cliente123', 10);
    await prisma.usuario.create({
      data: {
        nombre: 'Cliente Demo',
        email: 'cliente@hotelbot.com',
        password: passwordHash,
        rol: 'CLIENTE',
        telefono: '0991234567',
      },
    });
    console.log('✅ Usuario cliente creado');
  } else {
    console.log('⏭️  Usuario cliente ya existe');
  }

  // Crear habitaciones
  let creadas = 0;
  let omitidas = 0;

  for (const hab of habitaciones) {
    const existe = await prisma.habitacion.findUnique({
      where: { numero: hab.numero },
    });

    if (!existe) {
      await prisma.habitacion.create({ data: hab });
      creadas++;
      console.log(`✅ Habitación ${hab.numero} creada`);
    } else {
      omitidas++;
      console.log(`⏭️  Habitación ${hab.numero} ya existe`);
    }
  }

  console.log(`\n🎉 Seed completado: ${creadas} habitaciones creadas, ${omitidas} omitidas`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
