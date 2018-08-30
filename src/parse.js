'use strinct';
var _ = require('lodash')

function parse(expr) {
  var lexer = new Lexer();
  var parser= new Parser(lexer);
  return parser.parse(expr);
}

function Lexer() {

}

Lexer.prototype.lex = function(text) {
  this.text = text;
  this.index = 0;
  this.ch = undefined;
  this.tokens = [];

  while(this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
    if (this.isNumber(this.ch)) {
      this.readNumber();
    } else if (this.isWhitespace(this.ch)) {
      this.index++;
    } else if(this.ch === '\'' || this.ch === '"') {
      this.readString(this.ch);
    } else if(this.isIdent(this.ch)) {
      this.readIdent();
    } else {
      throw 'Unexpected next character: ' + this.ch;
    }
  }

  return this.tokens;
}

Lexer.prototype.isWhitespace = function(ch) {
  return ch === ' ' || ch === '\r' || ch === '\t'
    || ch === '\n' || ch === '\v' || ch === '\u00A0';
}

Lexer.prototype.readIdent = function() {
  var text = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (this.isIdent(ch) || this.isNumber(ch)) {
      text += ch;
    } else {
      break;
    }
    this.index++;
  }

  var token = {text: text};

  this.tokens.push(token);
}

Lexer.prototype.isIdent = function(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
    ch === '_' || ch === '$';
}

Lexer.prototype.readString = function(startingQuote){
  this.index++;
  var string = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);

    if (ch === startingQuote) {
      this.index++;
      this.tokens.push({
        text: string,
        value: string
      });
      return;
    } else {
      string += ch;
    }

    this.index++;
  }

  throw 'Unmatched quote';
}

Lexer.prototype.isNumber = function(ch) {
  return '0' <= ch && ch <= '9';
}

Lexer.prototype.readNumber = function() {
  var number = '';
  while (this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (this.isNumber(ch)) {
      number += ch;
    } else {
      break;
    }
    this.index++;
  }

  this.tokens.push({
    text: number,
    value: Number(number)
  })
}

function AST(lexer) {
  this.lexer = lexer;
}
AST.Program = 'Program';
AST.Literal = 'Literal';

AST.prototype.constants = {
  'null' : {type: AST.Literal, value: null},
  'true' : {type: AST.Literal, value: true},
  'false': {type: AST.Literal, value: false}
}

AST.prototype.ast = function(text) {
  this.tokens = this.lexer.lex(text);
  return this.program();
}

AST.prototype.program = function(){
  return {type: AST.Program, body: this.primary()};
}

AST.prototype.primary = function(){
  if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    return this.constants[this.tokens[0].text];
  } else {
    return this.constant();
  }
}

AST.prototype.constant = function(){
  return {type: AST.Literal, value: this.tokens[0].value};
}

function ASTCompiler(astBuilder) {
  this.astBuilder = astBuilder;
}

ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: []};
  this.recurse(ast);

  return new Function(this.state.body.join(''));
}

ASTCompiler.prototype.recurse = function(ast) {
  switch(ast.type) {
    case AST.Program:
      this.state.body.push('return ', this.recurse(ast.body), ';');
    case AST.Literal:
      return this.escape(ast.value);
  }
}

ASTCompiler.prototype.escape = function(value) {
  if (_.isString(value)) {
    return '\'' + value + '\'';
  } else if (_.isNull(value)) {
    return 'null';
  } else {
    return value;
  }
}

function Parser(lexer) {
  this.lexer = lexer;
  this.ast = new AST(this.lexer);
  this.astCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function(text) {
  return this.astCompiler.compile(text);
}

module.exports = parse;
