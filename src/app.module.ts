import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { QuestionsModule } from './questions/questions.module';
import { AnswersModule } from './answers/answers.module';
import { AnswerAttemptsModule } from './answer-attempts/answer-attempts.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { FavoriteQuestionsModule } from './favorite-questions/favorite-questions.module';
import { LessonsModule } from './lessons/lessons.module';
import { ModulesModule } from './modules/modules.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ProgressModule } from './progress/progress.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TagsModule } from './tags/tags.module';
import { TechnologiesModule } from './technologies/technologies.module';
import { TopicsModule } from './topics/topics.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    QuestionsModule,
    AnswersModule,
    AnswerAttemptsModule,
    CoursesModule,
    EnrollmentsModule,
    FavoriteQuestionsModule,
    LessonsModule,
    ModulesModule,
    NotificationsModule,
    ProgressModule,
    ReviewsModule,
    TagsModule,
    TechnologiesModule,
    TopicsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
