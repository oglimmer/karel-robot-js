"use strict";

// ************************************************************************
/* logging */

function log(msg) {
  if (process.env.JEST_WORKER_ID === undefined) {
   console.log(msg)
  }
}

// ************************************************************************
/* the parse and main method */

// called after reading stdin
async function main(input) {
  // TODO: create playfield via configuration (e.g. applicaton parameter)
  const playfield = new Playfield(10, 10);
  playfield.getField(5,5).content = Field.HOME;
  playfield.getField(0,1).content = Field.WALL;
  playfield.getField(1,1).content = Field.WALL;
  playfield.getField(2,1).content = Field.WALL;
  playfield.getField(5,0).content = Field.WALL;
  playfield.getField(5,1).content = Field.WALL;
  playfield.getField(5,2).content = Field.WALL;
  playfield.getField(3,7).content = Field.WALL;
  playfield.getField(3,8).content = Field.WALL;
  playfield.getField(3,9).content = Field.WALL;
  playfield.getField(7,7).content = Field.WALL;
  playfield.getField(8,7).content = Field.WALL;
  playfield.getField(9,7).content = Field.WALL;
  new Meeple(playfield.getField(0,0), playfield); // registers itself to the playfield
  
  try {
    const root = parse(input);
    await root.run(playfield);
  } catch (err) {
    console.error(err);
  }
}

module.exports.main = main

/* this parses input: Array<string> into an AST and returns the root of the AST */
function parse(input) {
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

module.exports.parse = parse


// ************************************************************************
/* Meeple, Field Playfield */

class Meeple {
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

class Field {
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
  getContent() {
    if(this.playfield.getMeeple().getField() === this) {
      switch(this.playfield.getMeeple().direction) {
        case Meeple.NORTH:
          return "^"
        case Meeple.EAST:
          return ">"
        case Meeple.SOUTH:
          return "v"
        case Meeple.WEST:
          return "<"
      }
    }
    switch(this.content) {
      case Field.HOME:
        return "H"
      case Field.WALL:
        return "W"
      default:
        return " "
    }
  }
}

class Playfield {
  constructor(x, y) {
    this.fields = []
    this.x = x;
    this.y = y;
    for (let ix = 0 ; ix < x ; ix++ ) {
      for (let iy = 0 ; iy < y ; iy++ ) {
        this.fields.push(new Field(ix, iy, this));
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
  print() {
    console.clear();
    let buff = "";
    for (let iy = 0 ; iy < this.y ; iy++ ) {
      buff += `---------------------------------------------------\n`
      // for (let ix = 0 ; ix < this.x ; ix++ ) {
      //   const field = this.getField(ix, iy);
      //   buff += `| ${field.x}:${field.y}`
      // }
      // buff += `|\n`
      for (let ix = 0 ; ix < this.x ; ix++ ) {
        const field = this.getField(ix, iy);
        buff += `| ${field.getContent()} ${field.packages>0?field.packages:" "}`
      }
      buff += `|\n`
    }
    buff += `---------------------------------------------------\n`
    log(buff);
  }
}

// ************************************************************************
/* ConditionHandler classes */


class ConditionHandler {
  constructor(operator, condition) {
    if(operator != "IST" && operator != "NICHT") {
      throw "Illegal operator " + operator;
    }
    if(!condition || !condition.validates) {
      throw "Condition missing";
    }
    this.operator = operator;
    this.condition = condition;
  }
  checkIf(playfield) {
    return this.condition.validates(playfield) === (this.operator === "NICHT"?false:true);
  }
  toString() {
    return `ConditionHandler::op:${this.operator},cond:${this.condition}`
  }
}


// ************************************************************************
/* Command classes */

const DELAY = process.env.DELAY | 20;

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

/* All Commands have a (possible) successor */
class BaseCommand {
  add(node) {
    this.nested = node;
    return node;
  }
  async run(playfield) {
    playfield.print();
    await delay(DELAY);
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
    case "HAUS":
      return new HomeCondition();
    case "WAND":
      return new WallCondition();
    case "NORDEN":
      return new DirectionCondition(Meeple.NORTH);
    case "OSTEN":
      return new DirectionCondition(Meeple.EAST);
    case "SÜDEN":
      return new DirectionCondition(Meeple.SOUTH);
    case "WESTEN":
      return new DirectionCondition(Meeple.WEST);
    case "ZUFALL":
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
      throw `Illegal token ${tokens[0].name} following LERNE`;
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
    this.registry = {}
  }
}

// ************************************************************************
/* AST builder */


class ASTBuilder {
  getBuilderForToken(token) {
    if(token.type == Tokenizer.SIMPLE) {
      if (token.name === "SCHRITT") {
        return new StepCommandBuilder();
      } else if (token.name === "LINKS-WENDUNG") {
        return new TurnLeftCommandBuilder();
      } else if (token.name === "PLATZIEREN") {
        return new PlacePackageCommandBuilder();
      } else if (token.name === "AUFHEBEN") {
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
    // this should be a FSM, to support logging a word like SCHRITT
    if (str === "SCHRITT") {
      return new Token(Tokenizer.SIMPLE, "SCHRITT");
    } else if (str === "LINKS-WENDUNG") {
      return new Token(Tokenizer.SIMPLE, "LINKS-WENDUNG");
    } else if (str === "PLATZIEREN") {
      return new Token(Tokenizer.SIMPLE, "PLATZIEREN");
    } else if (str === "AUFHEBEN") {
      return new Token(Tokenizer.SIMPLE, "AUFHEBEN");
    } else if (str === "WENN") {
      return new Token(Tokenizer.WITH_CONDITION, "WENN");
    } else if (str === "WIEDERHOLE") {
      return new Token(Tokenizer.WITH_INT, "WIEDERHOLE");
    } else if (str === "LERNE") {
      return new Token(Tokenizer.METHOD, "LERNE");
    } else if (str === "ENDE") {
      return new Token(Tokenizer.END, "ENDE");
    } else if (str === "SONST") {
      return new Token(Tokenizer.ELSE, "SONST");
    } else if (str === "LOG") {
      return new Token(Tokenizer.WITH_STRING, "LOG");
    } else if (str === "SAY") {
      return new Token(Tokenizer.WITH_STRING, "SAY");
    } else if (str === "TP") {
      return new Token(Tokenizer.WITH_2_INT, "TP");
    } else if (str === "SOLANGE") {
      return new Token(Tokenizer.AS_LONG_AS, "SOLANGE");
    } else {
      return new Token(Tokenizer.PARAM_OR_METHOD, str);
    }
  }
  /* input is an Array<string> and will be tokenized into keywords and their parameters */
  tokenize(input) {
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
