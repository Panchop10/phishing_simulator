# Simulador de Phishing

Plataforma interna y **autorizada** de concientización en seguridad. Permite a un
administrador cargar listas de correos (CSV), crear plantillas de correo, lanzar
campañas y medir **quién abrió** el correo y **quién hizo clic** en el enlace. Al
hacer clic, la persona llega a una página que le explica que cayó en una
simulación de phishing (el objetivo es **entrenar, no castigar**).

Todo el producto está en **español**. Pensado para correr como un contenedor en un
pod de Kubernetes o, más simple aún, con **un solo comando** en una instancia EC2.

## Características

- **Inicio de sesión de administrador único** (sin roles) creado con un asistente
  de configuración inicial. No hay que editar archivos ni generar hashes a mano.
- **Configuración desde el panel**: el SMTP (con la contraseña cifrada en reposo),
  la URL pública, el nombre de la organización, los dominios permitidos y los
  límites de envío se ajustan en la página **Configuración**.
- **Plantillas** de correo HTML con variables (`{{nombre}}`, `{{cargo}}`,
  `{{departamento}}`, `{{email}}`) y el enlace obligatorio `{{enlace}}`, con vista
  previa en vivo.
- **Campañas**: se crean con una plantilla, se importan los destinatarios por CSV
  (con validación y vista previa) y se lanzan. El envío ocurre en segundo plano,
  con control de velocidad y reintentos, y se reanuda solo si el pod se reinicia.
- **Panel de resultados por campaña**: enviados, aperturas y clics (con tasas),
  embudo, línea de tiempo y tabla de destinatarios filtrable.
- **Informes descargables** en **PDF** y **CSV**.
- **Rastreo** con un token único por destinatario: un pixel invisible registra la
  apertura y un enlace de redirección registra el clic y muestra la página
  educativa en español.

## Requisitos

- Docker y Docker Compose (plugin `docker compose`).
- Para desarrollo sin Docker: Node.js 22+ y un Postgres accesible.

## Inicio rápido (un comando)

```bash
git clone <este-repositorio> && cd phishing_simulator
./start.sh
```

`start.sh` genera un archivo `.env` con secretos aleatorios, construye la imagen,
levanta **Postgres + la aplicación** y aplica las migraciones automáticamente.
Cuando termine:

1. Abre `http://localhost:3000` → el **asistente de configuración** te pedirá crear
   la cuenta de administrador.
2. Entra a **Configuración** y define el **SMTP** y la **URL pública** (la misma por
   la que accedes a la plataforma). Pulsa **Enviar correo de prueba** para verificar.
3. Crea una **plantilla**, luego una **campaña**, importa un **CSV** de correos y
   pulsa **Lanzar**.

### En una instancia EC2

```bash
git clone <este-repositorio> && cd phishing_simulator
./scripts/ec2-bootstrap.sh   # instala Docker si falta y ejecuta start.sh
```

Abre `http://<DNS-publico-ec2>:3000`. Para producción, pon la plataforma detrás de
un proxy inverso con HTTPS (los enlaces de rastreo deberían ser `https://`) y usa
esa URL como **URL pública** en Configuración.

## Desarrollo local (con captura de correo)

```bash
docker compose up -d --build   # agrega Mailpit (override automático)
```

- App: `http://localhost:3000`
- **Mailpit** (bandeja de prueba): `http://localhost:8025`. En Configuración, define
  el SMTP con host `mailpit`, puerto `1025`, sin usuario ni contraseña.

Sin Docker: define `DATABASE_URL` en `.env`, y luego:

```bash
npm install
npm run prisma:deploy   # aplica migraciones
npm run dev
```

## Datos de ejemplo (demo)

Para revisar el panel y los informes sin crear datos a mano, puedes cargar un
conjunto de ejemplo: **5 plantillas** en español y **2 campañas ya "enviadas"** con
resultados ficticios (aperturas, clics y fallos repartidos en el tiempo para que el
embudo y la línea de tiempo se vean reales).

Con Docker (contenedores en ejecución):

```bash
make seed
# equivale a: docker compose exec -T app node scripts/seed-demo.mjs
```

Sin Docker (con `DATABASE_URL` definido y migraciones aplicadas):

```bash
npm run seed
```

Es re-ejecutable: recrea las campañas llamadas «Campaña de ejemplo — …» con números
nuevos y **no duplica ni borra** tus propias plantillas. Las campañas de ejemplo
quedan en estado «Enviada» con destinatarios ficticios `@empresa.cl`, por lo que
**nunca** se envían correos reales. Para quitarlas, usa el ícono de papelera en cada
campaña.

## Despliegue en Kubernetes

Manifiestos en [`k8s/`](k8s/):

```bash
# 1) Edita k8s/configmap.yaml (APP_BASE_URL) y crea el Secret
cp k8s/secret.example.yaml k8s/secret.yaml   # y rellena los valores
# 2) (Opcional) Postgres en el clúster, o usa una base gestionada
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml
kubectl apply -f k8s/service.yaml -f k8s/ingress.yaml -f k8s/deployment.yaml
```

- **1 réplica** con `strategy: Recreate` (un único worker de envío, sin duplicados).
- Un **initContainer** ejecuta `prisma migrate deploy` antes de arrancar la app.
- El `APP_BASE_URL` debe coincidir con el host del Ingress.

Construcción de la imagen (si tu clúster es amd64 y compilas en Mac arm64):

```bash
docker buildx build --platform linux/amd64 -t <registro>/phishing-sim:latest --push .
```

## Variables de entorno (solo arranque)

| Variable | Propósito | Secreto |
|---|---|---|
| `DATABASE_URL` | Conexión a Postgres (Prisma) | sí |
| `SESSION_SECRET` | Firma la cookie de sesión (≥32) | sí |
| `APP_ENCRYPTION_KEY` | Cifra la contraseña SMTP en reposo (≥32) | sí |
| `IP_HASH_SECRET` | HMAC de IP (no se guarda la IP en bruto) | sí |
| `APP_BASE_URL` | URL pública inicial (opcional; se puede fijar en el panel) | no |
| `APP_PORT` | Puerto publicado en el host (compose) | no |

El SMTP, la URL pública, los dominios permitidos y los límites de envío se
configuran **en el panel**, no por variables de entorno.

## Seguridad y ética

Es una herramienta **defensiva**. Controles clave:

- **Sin captura de credenciales**: la página de aterrizaje solo educa.
- **Sin redirecciones abiertas**: el enlace de clic lleva a una ruta fija del propio
  servidor (no acepta URLs por parámetro).
- **Lista de dominios permitidos** (en Configuración): si la defines, solo se envía a
  esos dominios; el resto queda "suprimido". Úsala en producción para evitar enviar
  a destinatarios externos.
- Validación de entradas, límite de intentos de inicio de sesión, cabeceras de
  seguridad y secretos solo en variables de entorno / Secrets.

## Limitaciones conocidas del rastreo de aperturas

El rastreo por pixel es **inherentemente ruidoso**: Apple Mail Privacy Protection y
el proxy de imágenes de Gmail pre-cargan el pixel (aperturas falsas o atribuidas al
proxy); los clientes que bloquean imágenes no registran aperturas; y las pasarelas
de seguridad pueden abrir el pixel y el enlace automáticamente. **Trata el clic como
el indicador principal y las aperturas como referenciales.** La bandera
`suspectedBot` y el hash de IP/User-Agent permiten filtrar ruido más adelante.

## Seguridad de dependencias

Las vulnerabilidades reportadas por `npm audit` están en herramientas de
**compilación/desarrollo** (p. ej. el observador de archivos de Tailwind y el CLI de
Prisma) que **no se incluyen** en la imagen de producción (salida `standalone` de
Next). Su corrección exige saltos de versión mayores (Tailwind 4 / Next 16).

## Comandos útiles

```bash
make up      # = ./start.sh (app + base de datos)
make dev     # app + base de datos + Mailpit
make seed    # carga datos de ejemplo (plantillas + campañas con resultados)
make logs    # registros de la app
make down    # detener
make clean   # detener y borrar volúmenes (¡borra la base de datos!)
```
