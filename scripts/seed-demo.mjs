// Carga datos de ejemplo: plantillas en español y campañas con resultados
// ficticios (enviados/aperturas/clics/fallos repartidos en el tiempo) para
// poder revisar el panel y los informes. Es re-ejecutable: recrea las campañas
// de ejemplo y no duplica las plantillas existentes.
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

const token = () => crypto.randomBytes(32).toString('base64url');
const rand = (a, b) => a + Math.random() * (b - a);
const randint = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const TEMPLATES = [
  {
    name: 'Verificación de cuenta — Soporte TI',
    subject: 'Acción requerida: verifica tu cuenta antes de 24 horas',
    bodyHtml: `<p>Hola {{nombre}},</p>
<p>Detectamos un inicio de sesión inusual en tu cuenta corporativa. Por seguridad, debes verificar tu identidad en las próximas 24 horas o tu acceso será suspendido.</p>
<p><a href="{{enlace}}">Verificar mi cuenta ahora</a></p>
<p>Gracias,<br/>Equipo de Soporte TI</p>`,
  },
  {
    name: 'Recursos Humanos — Actualización de contrato',
    subject: 'Actualización obligatoria de tus datos de contrato',
    bodyHtml: `<p>Estimado/a {{nombre}},</p>
<p>El área de Recursos Humanos necesita que confirmes tus datos antes del cierre de mes para procesar correctamente tu remuneración.</p>
<p><a href="{{enlace}}">Revisar y confirmar mis datos</a></p>
<p>Atentamente,<br/>Recursos Humanos</p>`,
  },
  {
    name: 'Entrega fallida — Paquetería',
    subject: 'Tu paquete no pudo ser entregado',
    bodyHtml: `<p>Hola {{nombre}},</p>
<p>Intentamos entregar tu paquete pero nadie se encontraba disponible. Reprograma la entrega para evitar su devolución.</p>
<p><a href="{{enlace}}">Reprogramar mi entrega</a></p>
<p>Centro de distribución</p>`,
  },
  {
    name: 'Restablecimiento de contraseña',
    subject: 'Restablece tu contraseña de inmediato',
    bodyHtml: `<p>Hola {{nombre}},</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no fuiste tú, confirma tu identidad para mantener tu cuenta segura.</p>
<p><a href="{{enlace}}">Restablecer mi contraseña</a></p>
<p>Seguridad de la información</p>`,
  },
  {
    name: 'Beneficio de fin de año',
    subject: 'Confirma tus datos para recibir tu bono de fin de año',
    bodyHtml: `<p>Hola {{nombre}},</p>
<p>¡Buenas noticias! Este año recibirás un bono especial. Para depositarlo necesitamos que confirmes tus datos bancarios antes del viernes.</p>
<p><a href="{{enlace}}">Confirmar mis datos y recibir el bono</a></p>
<p>Finanzas y Beneficios</p>`,
  },
];

const NOMBRES = ['Ana','Bruno','Carla','Diego','Elena','Felipe','Gabriela','Hugo','Isidora','Javier','Karina','Luis','María','Nicolás','Olivia','Pablo','Rocío','Sebastián','Tamara','Valentina','Camila','Matías','Fernanda','Rodrigo','Josefa','Tomás','Antonia','Benjamín','Catalina','Vicente'];
const APELLIDOS = ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda','Morales','Rodríguez','López','Fuentes','Araya','Flores','Espinoza','Castillo','Tapia','Reyes'];
const DEPTOS = ['Finanzas','Recursos Humanos','Tecnología','Ventas','Operaciones','Marketing','Legal','Atención al Cliente'];
const CARGOS = ['Analista','Jefe de Área','Ejecutivo','Gerente','Asistente','Coordinador','Especialista','Practicante'];
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
];

function evMeta(occurredAt, campaignId, type, bot = false) {
  return {
    campaignId,
    type,
    occurredAt,
    ipHash: crypto.randomBytes(8).toString('hex'),
    userAgent: pick(UAS),
    suspectedBot: bot,
  };
}

async function createDemoCampaign({ name, template, count, openRate, clickRate, daysAgo, failRate = 0.04 }) {
  const launchedAt = new Date(Date.now() - daysAgo * DAY);
  const completedAt = new Date(launchedAt.getTime() + 2 * DAY);
  const campaign = await prisma.campaign.create({
    data: {
      name,
      status: 'SENT',
      templateId: template.id,
      subjectSnapshot: template.subject,
      bodyHtmlSnapshot: template.bodyHtml,
      fromName: 'Soporte TI',
      fromEmail: 'no-reply@empresa.cl',
      authorizedBy: 'Equipo de Seguridad',
      authorizationNote: 'Ejercicio de concientización (datos de ejemplo)',
      launchedAt,
      completedAt,
    },
  });

  let sentN = 0, openedN = 0, clickedN = 0, failedN = 0;
  const used = new Set();

  for (let i = 0; i < count; i++) {
    const first = pick(NOMBRES);
    const last = pick(APELLIDOS);
    const nombre = `${first} ${last}`;
    let email = `${stripAccents(first).toLowerCase()}.${stripAccents(last).toLowerCase()}${i}@empresa.cl`;
    while (used.has(email)) email = `${stripAccents(first).toLowerCase()}${i}${randint(1, 99)}@empresa.cl`;
    used.add(email);

    const sent = Math.random() > failRate;
    const sentAt = sent ? new Date(launchedAt.getTime() + rand(0, 30 * MIN)) : null;
    let status = sent ? 'SENT' : 'FAILED';
    let firstOpenedAt = null, firstClickedAt = null, openCount = 0, clickCount = 0;
    const events = [];

    if (sent) {
      sentN++;
      const opened = Math.random() < openRate;
      if (opened) {
        openedN++;
        firstOpenedAt = new Date(sentAt.getTime() + rand(5 * MIN, 36 * HOUR));
        openCount = randint(1, 3);
        for (let k = 0; k < openCount; k++) {
          const at = new Date(firstOpenedAt.getTime() + (k === 0 ? 0 : rand(30 * MIN, 8 * HOUR)));
          events.push(evMeta(at, campaign.id, 'OPEN', Math.random() < 0.08));
        }
        if (Math.random() < clickRate) {
          clickedN++;
          firstClickedAt = new Date(firstOpenedAt.getTime() + rand(1 * MIN, 6 * HOUR));
          clickCount = randint(1, 2);
          for (let k = 0; k < clickCount; k++) {
            const at = new Date(firstClickedAt.getTime() + (k === 0 ? 0 : rand(30 * MIN, 4 * HOUR)));
            events.push(evMeta(at, campaign.id, 'CLICK'));
          }
        }
      } else if (Math.random() < 0.05) {
        // clic sin apertura (imágenes bloqueadas)
        clickedN++;
        firstClickedAt = new Date(sentAt.getTime() + rand(10 * MIN, 24 * HOUR));
        clickCount = 1;
        events.push(evMeta(firstClickedAt, campaign.id, 'CLICK'));
      }
    } else {
      failedN++;
    }

    await prisma.campaignRecipient.create({
      data: {
        campaignId: campaign.id,
        email,
        nombre,
        cargo: pick(CARGOS),
        departamento: pick(DEPTOS),
        token: token(),
        status,
        sentAt,
        messageId: sent ? `<demo-${campaign.id}-${i}@empresa.cl>` : null,
        lastError: sent ? null : '550 5.1.1 Destinatario desconocido',
        firstOpenedAt,
        firstClickedAt,
        openCount,
        clickCount,
        events: { create: events },
      },
    });
  }

  console.log(`  ✓ ${name}: ${count} destinatarios (${sentN} enviados, ${openedN} abrieron, ${clickedN} clic, ${failedN} fallidos)`);
  return campaign;
}

async function main() {
  console.log('Cargando datos de ejemplo…');

  // Plantillas: crear solo las que falten (no duplicar ni borrar las del usuario).
  const tmap = {};
  for (const t of TEMPLATES) {
    let existing = await prisma.template.findFirst({ where: { name: t.name, archivedAt: null } });
    if (!existing) existing = await prisma.template.create({ data: t });
    tmap[t.name] = existing;
  }
  console.log(`  ✓ ${TEMPLATES.length} plantillas disponibles`);

  // Recrear campañas de ejemplo (idempotente).
  await prisma.campaign.deleteMany({ where: { name: { startsWith: 'Campaña de ejemplo' } } });

  await createDemoCampaign({
    name: 'Campaña de ejemplo — Verificación de cuenta',
    template: tmap['Verificación de cuenta — Soporte TI'],
    count: 85, openRate: 0.62, clickRate: 0.46, daysAgo: 3,
  });
  await createDemoCampaign({
    name: 'Campaña de ejemplo — Bono de fin de año',
    template: tmap['Beneficio de fin de año'],
    count: 48, openRate: 0.74, clickRate: 0.58, daysAgo: 9,
  });

  console.log('Listo. Abre /campaigns para ver los resultados.');
}

main()
  .catch((e) => {
    console.error('Error al cargar datos de ejemplo:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
