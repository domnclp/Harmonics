import type { ScheduleBlock } from "../types";
import { getLogicalEndMinutes, getLogicalMinutes } from "./date";

export type PositionedBlock = {
  block: ScheduleBlock;
  column: number;
  columns: number;
};

const getBlockRange = (block: ScheduleBlock, dayStart = 0) => {
  const start = getLogicalMinutes(block.startTime, dayStart);
  const end = getLogicalEndMinutes(block.startTime, block.endTime, dayStart);
  return { start, end };
};

const overlaps = (left: ScheduleBlock, right: ScheduleBlock, dayStart = 0) => {
  const leftRange = getBlockRange(left, dayStart);
  const rightRange = getBlockRange(right, dayStart);
  return leftRange.start < rightRange.end && rightRange.start < leftRange.end;
};

export const getPositionedBlocks = (blocks: ScheduleBlock[], dayStart = 0): PositionedBlock[] => {
  const sorted = [...blocks].sort((a, b) => {
    const start = getLogicalMinutes(a.startTime, dayStart) - getLogicalMinutes(b.startTime, dayStart);
    if (start !== 0) return start;
    return getLogicalEndMinutes(a.startTime, a.endTime, dayStart) - getLogicalEndMinutes(b.startTime, b.endTime, dayStart);
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
        if (!overlaps(active[index].block, block, dayStart)) {
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
    const { start, end } = getBlockRange(block, dayStart);

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
