import { Module } from '@nestjs/common';
import { Subject } from "./subject";

@Module({
  providers: [Subject],
  exports: [Subject],
})
export class SubjectModule {}
