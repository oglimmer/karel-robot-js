

import { parse } from '../src/interpreter.js';

test('loop_1', () => {
  const root = parse(["REPEAT", "3-times", "move", "end"]);
  expect(root.toString()).toBe("LoopCounterCommand::couter:3,conditionalStatement:StepCommand, ");
});

test('loop_2', () => {
  const root = parse(["REPEAT", "3-times", "move", "move", "move", "end"]);
  expect(root.toString()).toBe("LoopCounterCommand::couter:3,conditionalStatement:StepCommand->StepCommand->StepCommand, ");
});

test('loop_aslongas_1', () => {
  const root = parse(["REPEAT", "until", "is", "house", "move", "end"]);
  expect(root.toString()).toBe("LoopConditionCommand::conHandler:ConditionHandler::op:IS,cond:HomeCondition,conditionalStatement:StepCommand, ");
});

test('loop_aslongas_not_1', () => {
  const root = parse(["REPEAT", "until", "not", "house", "move", "end"]);
  expect(root.toString()).toBe("LoopConditionCommand::conHandler:ConditionHandler::op:NOT,cond:HomeCondition,conditionalStatement:StepCommand, ");
});
