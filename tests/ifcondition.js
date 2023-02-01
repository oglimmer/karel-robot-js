

import { parse } from '../src/interpreter.js';

test('simple_if_1', () => {
  const root = parse(["if is house", "move", "end"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:IS,cond:HomeCondition,stmt:StepCommand,else:undefined, ");
});

test('simple_if_not_1', () => {
  const root = parse(["if not house", "move", "end"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:NOT,cond:HomeCondition,stmt:StepCommand,else:undefined, ");
});

test('simple_if_sonst_1', () => {
  const root = parse(["if is house", "move", "end, else", "move", "end"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:IS,cond:HomeCondition,stmt:StepCommand,else:StepCommand, ");
});

test('simple_if_not_sonst_1', () => {
  const root = parse(["if not house", "move", "end, else", "move", "end"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:NOT,cond:HomeCondition,stmt:StepCommand,else:StepCommand, ");
});

test('simple_if_not_sonst_2', () => {
  const root = parse(["if not house", "move", "log \"mega\"", "move", "end, else", "move", "move", "move", "end"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:NOT,cond:HomeCondition,stmt:StepCommand->LogCommand::message:\"MEGA\", ->StepCommand,else:StepCommand->StepCommand->StepCommand, ");
});
