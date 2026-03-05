import { buildApp } from "./app.js";

const app = buildApp();

const start = async (): Promise<void> => {
  const port = Number(process.env.PORT) || 3000;

  await app.listen({ port, host: '0.0.0.0' });
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
