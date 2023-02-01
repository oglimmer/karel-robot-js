// ************************************************************************
/* logging */

function log(msg) {
  if (typeof process !== 'object' || process.env.JEST_WORKER_ID === undefined) {
   console.log(msg)
  }
}

// ************************************************************************
/* this parses input: Array<string> into an AST and returns the root of the AST */

export function parse(input) {
  GlobalMethodRegistry.singleton.clear();
  // TOKENIZE
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenize(input);
  log("**TOKENS**");
  log(tokens)
  // INTO AST
  const astBuilder = new ASTBuilder();
  astBuilder.build(tokens);
  const root = astBuilder.root;
  log("****AST*****");
  log(`${root}`);
  return root;
}

// ************************************************************************
/* Meeple, Field Playfield */

export class Meeple {
  static NORTH = 0;
  static EAST = 1;
  static SOUTH = 2;
  static WEST = 3;
  constructor(initField, playfield) {
    this.playfield = playfield;
    this.field = initField;
    this.direction = Meeple.SOUTH;
    this.playfield.meeple = this;
  }
  step() {
    let newField;
    switch(this.direction) {
    case Meeple.NORTH:
      newField = this.playfield.getField(this.field.x, this.field.y - 1);
      break;
    case Meeple.EAST:
      newField = this.playfield.getField(this.field.x + 1, this.field.y);
      break;
    case Meeple.SOUTH:
      newField = this.playfield.getField(this.field.x, this.field.y + 1);
      break;
    case Meeple.WEST:
      newField = this.playfield.getField(this.field.x - 1, this.field.y);
      break;
    }
    if (newField && !newField.isWall()) {
      this.field = newField;
    }
  }
  turnLeft() {
    this.direction++;
    if(this.direction > Meeple.WEST) {
      this.direction = Meeple.NORTH;
    }
  }
  getField() {
    return this.field;
  }
  setField(x,y) {
    this.field = this.playfield.getField(x,y);
  }
}

export class Field {
  static HOME = 1;
  static WALL = 2;
  constructor(x, y, playfield) {
    this.x = x;
    this.y = y;
    this.playfield = playfield;
    this.content = 0; //this is a bit-field for now
    this.packages = 0;
  }
  isWall() {
    return (this.content & Field.WALL) !== 0;
  }
  isHome() {
    return (this.content & Field.HOME) !== 0;
  }
  clearFlag(flag) {
    this.content &= ~flag;
  }
  setFlag(flag) {
    this.content |= flag;
  }
  toggleFlag(flag) {
    this.content ^= flag;
  }
  isMeeple() {
    return this.playfield.getMeeple() && this.playfield.getMeeple().getField() === this;
  }
  setMeeple() {
    this.playfield.getMeeple().setField(this.x, this.y);
  }
}

export class Playfield {
  constructor(x, y, ObjClazz) {
    this.fields = []
    this.x = x;
    this.y = y;
    this.meeple = null;
    this.packages = 0;
    for (let iy = 0 ; iy < y ; iy++ ) {
     for (let ix = 0 ; ix < x ; ix++ ) {
        const newObj = new ObjClazz(ix, iy, this);
        this.fields.push(newObj);
      }
    }
  }
  getMeeple() {
    return this.meeple;
  }
  getField(x,y) {
    if (!this.existsField(x,y)) {
      return undefined;
    }
    // TODO: this is a pretty bad implementation FIXME
    return this.fields.filter(e => e.x === x && e.y === y)[0];
  }
  existsField(x,y) {
    return !(x < 0 || y < 0 || x >= this.x || y >= this.y);
  }
}

// ************************************************************************
/* ConditionHandler classes */


class ConditionHandler {
  constructor(operator, condition) {
    if(operator != "IS" && operator != "NOT") {
      throw "Illegal operator " + operator;
    }
    if(!condition || !condition.validates) {
      throw "Condition missing";
    }
    this.operator = operator;
    this.condition = condition;
  }
  checkIf(playfield) {
    return this.condition.validates(playfield) === (this.operator === "NOT"?false:true);
  }
  toString() {
    return `ConditionHandler::op:${this.operator},cond:${this.condition}`
  }
}


// ************************************************************************
/* Command classes */

export const DELAY = {
  value: typeof process === 'object' ? process.env.DELAY | 20 : 20
};

function delay() {
  return new Promise(resolve => setTimeout(resolve, DELAY.value));
}

/* All Commands have a (possible) successor */
export class BaseCommand {
  static abort = false;
  add(node) {
    this.nested = node;
    return node;
  }
  async run(playfield) {
    if (playfield.print) {
      playfield.print();
    }
    if (BaseCommand.abort) {
      throw "Run aborted.";
    }
    await delay();
    if(this.nested) {
      await this.nested.run(playfield);
    }
  }
}

/*  */
class StepCommand extends BaseCommand {
  async run(playfield) {
    playfield.getMeeple().step();
    await super.run(playfield);
  }
  toString() {
    return `StepCommand${this.nested?"->"+this.nested:""}`
  }
}

class TurnLeftCommand extends BaseCommand {
  async run(playfield) {
    playfield.getMeeple().turnLeft();
    await super.run(playfield);
  }
  toString() {
    return `TurnLeftCommand${this.nested?"->"+this.nested:""}`
  }
}

class PlacePackageCommand extends BaseCommand {
  async run(playfield) {
    if (playfield.getMeeple().package === true && playfield.getMeeple().getField().packages < 8) {
      playfield.getMeeple().getField().packages++;
      playfield.getMeeple().package=false;
    }
    await super.run(playfield);
  }
  toString() {
    return `PlacePackageCommand${this.nested?"->"+this.nested:""}`
  }
}

class PickupPackageCommand extends BaseCommand {
  async run(playfield) {
    if (playfield.getMeeple().package !== true && playfield.getMeeple().getField().packages > 0) {
      playfield.getMeeple().getField().packages--;
      playfield.getMeeple().package=true;
    }
    await super.run(playfield);
  }
  toString() {
    return `PickupPackageCommand${this.nested?"->"+this.nested:""}`
  }
}

class IfConditionCommand extends BaseCommand {
  constructor(operator, condition, conditionalStatement, elseStatement) {
    super();
    this.conditionalStatement = conditionalStatement;
    this.elseStatement = elseStatement;
    this.conditionHandler = new ConditionHandler(operator, condition);
  }
  async run(playfield) {
    if (this.conditionHandler.checkIf(playfield)) {
      await this.conditionalStatement.run(playfield);
    } else if (this.elseStatement) {
      await this.elseStatement.run(playfield);
    }
    await super.run(playfield);
  }
  toString() {
    return `IfCondition::conHandler:${this.conditionHandler},stmt:${this.conditionalStatement},else:${this.elseStatement}, ${this.nested?"->"+this.nested:""}`
  }
}

class LoopCounterCommand extends BaseCommand {
  constructor(couter, conditionalStatement) {
    super();
    this.couter = couter;
    this.conditionalStatement = conditionalStatement;
  }
  async run(playfield) {
    let i = 0;
    while(i++ < this.couter) {
      await this.conditionalStatement.run(playfield);
    }
    await super.run(playfield);
  }
  toString() {
    return `LoopCounterCommand::couter:${this.couter},conditionalStatement:${this.conditionalStatement}, ${this.nested?"->"+this.nested:""}`
  }
}

class LoopConditionCommand extends BaseCommand {
  constructor(operator, condition, conditionalStatement) {
    super();
    this.conditionalStatement = conditionalStatement;
    this.conditionHandler = new ConditionHandler(operator, condition);
  }
  async run(playfield) {
    while(this.conditionHandler.checkIf(playfield)) {
      await this.conditionalStatement.run(playfield);
    }
    await super.run(playfield);
  }
  toString() {
    return `LoopConditionCommand::conHandler:${this.conditionHandler},conditionalStatement:${this.conditionalStatement}, ${this.nested?"->"+this.nested:""}`
  }
}

class MethodCommand /* does not extends BaseCommand as it doesn't have a successor */{
  constructor(name, bodyBlock) {
    this.name = name;
    this.bodyBlock = bodyBlock;
  }
  async run(playfield) {
    await this.bodyBlock.run(playfield);
  }
  toString() {
    return `Method::name:${this.name},bodyBlock:${this.bodyBlock}`
  }
}

class LogCommand extends BaseCommand {
  constructor(message) {
    super();
    this.message = message;
  }
  async run(playfield) {
    log(this.message);
    await super.run(playfield);
  }
  toString() {
    return `LogCommand::message:${this.message}, ${this.nested?"->"+this.nested:""}`
  }
}

class SayCommand extends BaseCommand {
  constructor(message) {
    super();
    this.message = message;
  }
  async run(playfield) {
    alert(this.message);
    await super.run(playfield);
  }
  toString() {
    return `SayCommand::message:${this.message}, ${this.nested?"->"+this.nested:""}`
  }
}

class TpCommand extends BaseCommand {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }
  async run(playfield) {
    this.playfield.getMeeple().setField(this.x, this.y);
    await super.run(playfield);
  }
  toString() {
    return `TpCommand::x:${this.x},y:${this.y} ${this.nested?"->"+this.nested:""}`
  }
}

// ************************************************************************
/* Condition classes */

function convertToConditionObject(name) {
  switch(name) {
    case "HOUSE":
      return new HomeCondition();
    case "WALL":
      return new WallCondition();
    case "NORTH":
      return new DirectionCondition(Meeple.NORTH);
    case "EAST":
      return new DirectionCondition(Meeple.EAST);
    case "SOUTH":
      return new DirectionCondition(Meeple.SOUTH);
    case "WEST":
      return new DirectionCondition(Meeple.WEST);
    case "RANDOM":
      return new RandomCondition();
    default:
      throw "Unknown condition " + name;
    }
}

class HomeCondition {
  validates(playfield) {
    return playfield.getMeeple().getField().isHome();
  }
  toString() {
    return "HomeCondition";
  }
}

class DirectionCondition {
  constructor(direction) {
    this.direction = direction;
  }
  validates(playfield) {
    return playfield.getMeeple().direction === this.direction;
  }
  toString() {
    return `DirectionCondition[${this.direction}]`;
  }
}

class WallCondition {
  validates(playfield) {
    const meeple = playfield.getMeeple();
    let field;
    switch(meeple.direction) {
      case Meeple.NORTH:
        field = playfield.getField(meeple.getField().x, meeple.getField().y - 1);
        break;
      case Meeple.EAST:
        field = playfield.getField(meeple.getField().x + 1, meeple.getField().y);
        break;
      case Meeple.SOUTH:
        field = playfield.getField(meeple.getField().x, meeple.getField().y + 1);
        break;
      case Meeple.WEST:
        field = playfield.getField(meeple.getField().x - 1, meeple.getField().y);
        break;
    }
    // !field means outside of the playfield
    return !field || field.isWall();
  }
  toString() {
    return "WallCondition";
  }
}

class RandomCondition {
  validates(playfield) {
    return Math.random() > 0.5;
  }
  toString() {
    return "RandomCondition";
  }
}


// ************************************************************************
/* Builders for Commands */

class StepCommandBuilder {
  processAdditionalTokens(tokens) { return 0; }
  build() {
    return new StepCommand();
  }
}

class TurnLeftCommandBuilder {
  processAdditionalTokens(tokens) { return 0; }
  build() {
    return new TurnLeftCommand();
  }
}

class PlacePackageCommandBuilder {
  processAdditionalTokens(tokens) { return 0; }
  build() {
    return new PlacePackageCommand();
  }
}

class PickupPackageCommandBuilder {
  processAdditionalTokens(tokens) { return 0; }
  build() {
    return new PickupPackageCommand();
  }
}

class IfConditionBuilder {
  processAdditionalTokens(tokens) {
    this.operator = tokens[0].name;
    this.condition = convertToConditionObject(tokens[1].name);
    const astBuilder = new ASTBuilder();
    astBuilder.build(tokens.slice(2), Tokenizer.END);
    this.conditionalStatement = astBuilder.root;
    if (tokens.length >= astBuilder.i + 3 && tokens[astBuilder.i + 2].type === Tokenizer.ELSE) {
      const astBuilderElse = new ASTBuilder();
      astBuilderElse.build(tokens.slice(astBuilder.i + 3), Tokenizer.END);
      this.elseStatement = astBuilderElse.root;
      return astBuilder.i + 3 + astBuilderElse.i;
    } else {
      return astBuilder.i + 2;
    }
  }
  build() {
    return new IfConditionCommand(this.operator, this.condition, this.conditionalStatement, this.elseStatement);
  }
}

class LoopBuilder {
  processAdditionalTokens(tokens) {
    let i;
    if (tokens[0].type == Tokenizer.AS_LONG_AS) {
      this.operator = tokens[1].name;
      this.condition = convertToConditionObject(tokens[2].name);
      i = 3;
    } else {
      this.loopCounter = parseInt(tokens[0].name.substr(0, tokens[0].name.indexOf('-')));
      i = 1;
    }
    const astBuilder = new ASTBuilder();
    astBuilder.build(tokens.slice(i), Tokenizer.END);
    this.conditionalStatement = astBuilder.root;
    return astBuilder.i + i;
  }
  build() {
    if (this.condition) {
      return new LoopConditionCommand(this.operator, this.condition, this.conditionalStatement);
    } else {
      return new LoopCounterCommand(this.loopCounter, this.conditionalStatement);
    }
  }
}

class LogBuilder {
  processAdditionalTokens(tokens) {
    if(tokens[0].type != Tokenizer.PARAM_OR_METHOD) {
      throw `Illegal token ${tokens[0].name} following LOG`;
    }
    this.message = tokens[0].name;
    return 1
  }
  build() {
    return new LogCommand(this.message);
  }
}

class SayBuilder {
  processAdditionalTokens(tokens) {
    if(tokens[0].type != Tokenizer.PARAM_OR_METHOD) {
      throw `Illegal token ${tokens[0].name} following SAY`;
    }
    this.message = tokens[0].name;
    return 1
  }
  build() {
    return new SayCommand(this.message);
  }
}

class MethodCreationBuilder {
  processAdditionalTokens(tokens) {
    if(tokens[0].type != Tokenizer.PARAM_OR_METHOD) {
      throw `Illegal token ${tokens[0].name} following LEARN`;
    }
    this.name = tokens[0].name;
    const astBuilder = new ASTBuilder()
    astBuilder.build(tokens.slice(1), Tokenizer.END);
    this.bodyBlock = astBuilder.root
    return astBuilder.i + 1
  }
  build() {
    if (GlobalMethodRegistry.singleton.registry[this.name]) {
      throw "Cannot redefine symbol " + this.name;
    }
    GlobalMethodRegistry.singleton.registry[this.name] = new MethodCommand(this.name, this.bodyBlock);
  }
}

class MethodCallBuilder {
  constructor(name) {
    this.name = name;
  }
  processAdditionalTokens(tokens) {
    return 0;
  }
  build() {
    const method = GlobalMethodRegistry.singleton.registry[this.name];
    if (!method) {
      throw "Undefined symbol " + this.name;
    }
    return method;
  }
}

class TpBuilder {
  processAdditionalTokens(tokens) {
    this.x = tokens[0].name;
    this.y = tokens[1].name;
    return 2;
  }
  build() {
    return new TpCommand(this.x, this.y);
  }
}

// ************************************************************************
/* The global method registry */


class GlobalMethodRegistry {
  static singleton = new GlobalMethodRegistry()
  constructor() {
    this.clear();
  }
  clear() {
    this.registry = {};
  }
}

// ************************************************************************
/* AST builder */


class ASTBuilder {
  getBuilderForToken(token) {
    if(token.type == Tokenizer.SIMPLE) {
      if (token.name === "MOVE") {
        return new StepCommandBuilder();
      } else if (token.name === "TURNLEFT") {
        return new TurnLeftCommandBuilder();
      } else if (token.name === "DROP") {
        return new PlacePackageCommandBuilder();
      } else if (token.name === "PICKUP") {
        return new PickupPackageCommandBuilder();
      }
    } else if(token.type == Tokenizer.WITH_CONDITION) {
      return new IfConditionBuilder();
    } else if(token.type == Tokenizer.WITH_INT) {
      return new LoopBuilder();
    } else if(token.type == Tokenizer.WITH_STRING) {
      if (token.name === "LOG") {
        return new LogBuilder();
      } else if (token.name === "SAY") {
        return new SayBuilder();
      }
    } else if(token.type == Tokenizer.METHOD) {
      return new MethodCreationBuilder();
    } else if(token.type == Tokenizer.PARAM_OR_METHOD) {
      return new MethodCallBuilder(token.name);
    } else if(token.type == Tokenizer.WITH_2_INT) {
      return new TpBuilder();
    }
  }
  build(tokens /*type:Token*/, stopOnTokenType /*nullable*/) {
    let root = undefined
    let last = undefined
    let i = 0;
    for ( ; i < tokens.length ; i++) {
      const token = tokens[i];
      if (stopOnTokenType && token.type === stopOnTokenType) {
        i++;
        break;
      }
      const nodeBuilder = this.getBuilderForToken(token);
      // give the builder the chance to process more tokens: either because it's a parameter or the token has a body block
      i += nodeBuilder.processAdditionalTokens(tokens.slice(i + 1));
      const newNode = nodeBuilder.build();
      if (newNode) {
        if (!root) {
          last = root = newNode;
        } else {
          last = last.add(newNode);
        }
      }
    }
    if(!root) {
      throw "No callable code"
    }
    this.root = root;
    this.i = i
  }
}


// ************************************************************************
/* Token and Tokenizer */


/* A token has a type:number and a name:string */
class Token {
  constructor(type, name) {
    this.type = type;
    this.name = name;
  }
  toString() {
    return `${this.type}:${this.name}`;
  }
}

class Tokenizer {
  static SIMPLE = 0
  static WITH_CONDITION = 1
  static WITH_INT = 2
  static END = 3
  static PARAM_OR_METHOD = 4
  static METHOD = 5
  static WITH_STRING = 6
  static WITH_2_INT = 7
  static ELSE = 8
  static AS_LONG_AS = 9
  getToken(str) {
    // this should be a FSM, to support logging a word like MOVE
    if (str === "MOVE") {
      return new Token(Tokenizer.SIMPLE, "MOVE");
    } else if (str === "TURNLEFT") {
      return new Token(Tokenizer.SIMPLE, "TURNLEFT");
    } else if (str === "DROP") {
      return new Token(Tokenizer.SIMPLE, "DROP");
    } else if (str === "PICKUP") {
      return new Token(Tokenizer.SIMPLE, "PICKUP");
    } else if (str === "IF") {
      return new Token(Tokenizer.WITH_CONDITION, "IF");
    } else if (str === "REPEAT") {
      return new Token(Tokenizer.WITH_INT, "REPEAT");
    } else if (str === "LEARN") {
      return new Token(Tokenizer.METHOD, "LEARN");
    } else if (str === "END") {
      return new Token(Tokenizer.END, "END");
    } else if (str === "ELSE") {
      return new Token(Tokenizer.ELSE, "ELSE");
    } else if (str === "LOG") {
      return new Token(Tokenizer.WITH_STRING, "LOG");
    } else if (str === "SAY") {
      return new Token(Tokenizer.WITH_STRING, "SAY");
    } else if (str === "TP") {
      return new Token(Tokenizer.WITH_2_INT, "TP");
    } else if (str === "UNTIL") {
      return new Token(Tokenizer.AS_LONG_AS, "UNTIL");
    } else {
      return new Token(Tokenizer.PARAM_OR_METHOD, str);
    }
  }
  /* input is an Array<string> and will be tokenized into keywords and their parameters */
  tokenize(input) {
    if (!Array.isArray(input)) {
      input = [input];
    }
    const resultToken = [];
    for (const row of input) {
      const rowTrimmedAndUppercase = row.trim().toUpperCase();
      if (rowTrimmedAndUppercase) {
        // this regex matches whitespace and commana and keeps multiple words in quotes as one token
        const matches = rowTrimmedAndUppercase.match(/(?:[^\s,"]+|"[^"]*")+/g);
        for (const word of matches) {
          resultToken.push(this.getToken(word));
        }
      }
    }
    return resultToken;
  }
}
