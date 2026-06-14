import type { ScheduleBlock } from "../types";
import { toMinutes } from "./date";

export type PositionedBlock = {
  block: ScheduleBlock;
  column: number;
  columns: number;
};

const overlaps = (left: ScheduleBlock, right: ScheduleBlock) =>
  toMinutes(left.startTime) < toMinutes(right.endTime) && toMinutes(right.startTime) < toMinutes(left.endTime);

export const getPositionedBlocks = (blocks: ScheduleBlock[]): PositionedBlock[] => {
  const sorted = [...blocks].sort((a, b) => {
    const start = toMinutes(a.startTime) - toMinutes(b.startTime);
    if (start !== 0) return start;
    return toMinutes(a.endTime) - toMinutes(b.endTime);
  });

  const positioned: PositionedBlock[] = [];
  let group: ScheduleBlock[] = [];
  let groupEnd = 0;

  const flushGroup = () => {
    if (!group.length) return;

    const active: Array<{ block: ScheduleBlock; column: number }> = [];
    const assignments = new Map<string, number>();
    let columns = 0;

    for (const block of group) {
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (!overlaps(active[index].block, block)) {
          active.splice(index, 1);
        }
      }

      const usedColumns = new Set(active.map((item) => item.column));
      let column = 0;
      while (usedColumns.has(column)) column += 1;

      assignments.set(block.id, column);
      active.push({ block, column });
      columns = Math.max(columns, column + 1);
    }

    for (const block of group) {
      positioned.push({ block, column: assignments.get(block.id) ?? 0, columns });
    }

    group = [];
    groupEnd = 0;
  };

  for (const block of sorted) {
    const start = toMinutes(block.startTime);
    const end = toMinutes(block.endTime);

    if (group.length && start >= groupEnd) {
      flushGroup();
    }

    group.push(block);
    groupEnd = Math.max(groupEnd, end);
  }

  flushGroup();
  return positioned;
};

export const getColumnStyle = (column: number, columns: number, gutter = 8) => {
  if (columns <= 1) {
    return {
      left: 12,
      right: 12
    };
  }

  const width = 100 / columns;
  const leftInset = 12 + (column > 0 ? gutter / 2 : 0);
  const rightInset = 12 + (column < columns - 1 ? gutter / 2 : 0);

  return {
    left: `calc(${column * width}% + ${leftInset}px)`,
    right: `calc(${100 - (column + 1) * width}% + ${rightInset}px)`
  };
};
