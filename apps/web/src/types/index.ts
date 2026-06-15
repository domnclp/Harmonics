type TemplateItem = {
  id: string;
  title: string;
  sortOrder: number;
};

export type BlockTemplate = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  category: string;
  journalPrompt?: string | null;
  isTemporary?: boolean;
  habits: TemplateItem[];
  tasks: TemplateItem[];
};

export type Schedule = {
  id: string;
  name: string;
};

export type ScheduleBlock = {
  id: string;
  scheduleId: string;
  templateId: string;
  dayOfWeek: number;
  date?: string | null;
  startTime: string;
  endTime: string;
  recurrenceRule: string;
  template: BlockTemplate;
  schedule?: Schedule;
};

export type Completion = {
  id: string;
  title: string;
  completed: boolean;
  failureReason?: string | null;
};

type JournalEntry = {
  id: string;
  content: string;
};

export type BlockInstance = {
  id: string;
  scheduleBlockId: string;
  templateId: string;
  date: string;
  startTime: string;
  endTime: string;
  completionPercentage: number;
  scheduleBlock: ScheduleBlock;
  template: BlockTemplate;
  habitCompletions: Completion[];
  taskCompletions: Completion[];
  journalEntry: JournalEntry;
};
