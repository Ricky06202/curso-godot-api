import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie } from 'hono/cookie';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import * as schema from './db/schema.js';
import { Google } from "arctic";
import 'dotenv/config';

const app = new Hono();
app.use('/api/*', cors());

// Ruta de bienvenida para verificar que la API funciona
app.get("/", (c) => {
  return c.json({
    status: "online",
    message: "Godot Course API is running",
    version: "1.0.0",
    endpoints: {
      auth_google: "/api/auth/google",
      course_data: "/api/course/:userId"
    }
  });
});

// Configuración de OAuth
const callbackUrl = process.env.BACKEND_URL 
  ? `${process.env.BACKEND_URL}/api/auth/callback/google` 
  : "http://localhost:3000/api/auth/callback/google";

const google = new Google(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl
);

// Conexión a MySQL
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4321";

// --- RUTAS DE AUTENTICACIÓN ---

// GOOGLE
app.get("/api/auth/google", async (c) => {
  const state = Math.random().toString(36).substring(2);
  const codeVerifier = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  
  const url = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ["profile", "email"]
  });
  
  setCookie(c, "google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 10 });
  setCookie(c, "google_code_verifier", codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 10 });
  
  return c.redirect(url.toString());
});

app.get("/api/auth/callback/google", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "google_oauth_state");
  const codeVerifier = getCookie(c, "google_code_verifier");

  if (!code || !state || state !== storedState || !codeVerifier) {
    return c.text("Error de validación", 400);
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const googleUserResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` }
    });
    const googleUser = await googleUserResponse.json();

    let user = await db.select().from(schema.users).where(
      eq(schema.users.googleId, googleUser.sub)
    );

    if (user.length === 0) {
      await db.insert(schema.users).values({
        username: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub,
        avatarUrl: googleUser.picture
      });
    }

    return c.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error(error);
    return c.text("Error durante la autenticación con Google", 500);
  }
});

// --- ENDPOINTS DE LA API ---

app.get('/api/course/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  const allLessons = await db.select().from(schema.lessons).orderBy(schema.lessons.order);
  const userProgress = await db.select()
    .from(schema.progress)
    .where(eq(schema.progress.userId, Number(userId)));

  return c.json({
    lessons: allLessons,
    progress: userProgress
  });
});

// ENDPOINT: Marcar lección como completada (5 min de video terminados)
app.post('/api/complete', async (c) => {
  const { userId, lessonId } = await c.req.json();
  
  await db.insert(schema.progress).values({
    userId,
    lessonId,
    completed: true
  });

  return c.json({ success: true, message: '¡Progreso de Godot guardado!' });
});

const port = process.env.PORT || 3000;
console.log(`🚀 Servidor Godot 4.6 activo en http://localhost:${port}`);

serve({ fetch: app.fetch, port: Number(port) });