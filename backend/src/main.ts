import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. Enable CORS so your frontend can communicate with the API securely
  app.enableCors();
  
  // 2. Register your global error handling filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // 3. Dynamic Port Binding for Render Cloud Environment
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  
  console.log(`🚀 Backend Running on Port : ${port}`);
  console.log(`🌍 Access Backend Context : http://localhost:${port}`);
}
bootstrap();