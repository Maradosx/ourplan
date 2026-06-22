import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';
import { AuthModule } from './auth/auth.module';
import { SchedulesModule } from './schedules/schedules.module';
import { FriendsModule } from './friends/friends.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { QuickShiftsModule } from './quick-shifts/quick-shifts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    SchedulesModule,
    FriendsModule,
    UsersModule,
    GroupsModule,
    QuickShiftsModule,
  ],
  // AppController exposes the root route and GET /health (used by Docker/CI healthchecks).
  controllers: [AppController],
  providers: [
    AppService,
    // Register the throttler as a global guard so the @Throttle() decorators
    // on auth routes (login/register/forgot-password) actually take effect.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Translate Prisma errors (e.g. P2025 not-found, P2002 unique) into proper
    // 4xx responses instead of leaking 500s with internal details.
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
