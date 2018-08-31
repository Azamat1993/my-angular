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
    } else if(this.is('\'"')) {
      this.readString(this.ch);
    } else if(this.isIdent(this.ch)) {
      this.readIdent();
    } else if (this.is('[]{},:')) {
      this.tokens.push({
        text: this.ch
      });
      this.index++;
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

Lexer.prototype.is = function(letters) {
  return letters.indexOf(this.ch) >= 0;
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
AST.ArrayExpression = 'ArrayExpression';
AST.ObjectExpression = 'ObjectExpression';
AST.Property = 'Property';

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
  if (this.expect('[')) {
    return this.arrayDeclaration();
  } else if(this.expect('{')) {
    return this.object();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    return this.constants[this.consume().text];
  } else {
    return this.constant();
  }
}

AST.prototype.object = function(){
  var properties = [];
  if(!this.peek('}')) {
    do {
      var property = {type: AST.Property};
      property.key = this.constant();
      this.consume(':');
      property.value = this.primary();
      properties.push(property);
    } while (this.expect(','))
  }
  this.consume('}');
  return {type: AST.ObjectExpression, properties: properties};
}

AST.prototype.expect = function(e) {
  var token = this.peek(e);
  if (token) {
    return this.tokens.shift();
  }
}

AST.prototype.consume = function(e) {
  var token = this.expect(e);

  if (!token) {
    throw 'Unexpected. Expected: ' + e;
  }
  return token;
}

AST.prototype.arrayDeclaration = function(){
  var elements = [];
  if (!this.peek(']')) {
    do {
      if (this.peek(']')) {
        break;
      }
      elements.push(this.primary());
    } while (this.expect(','));
  }
  this.consume(']');
  return {type: AST.ArrayExpression, elements: elements};
}

AST.prototype.peek = function(e) {
  if(this.tokens.length > 0) {
    var text = this.tokens[0].text;
    if (text === e || !e) {
      return this.tokens[0];
    }
  }
}

AST.prototype.constant = function(){
  return {type: AST.Literal, value: this.consume().value};
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
    case AST.ArrayExpression:
      var elements = _.map(ast.elements, function(element) {
        return this.recurse(element);
      }.bind(this));
      return '[' + elements.join(',') + ']';
    case AST.ObjectExpression:
      var properties = _.map(ast.properties, function(property) {
        var key = this.escape(property.key.value);
        var value = this.recurse(property.value);
        return key + ':' + value;
      }.bind(this));
      return '{' + properties.join(',') + '}';
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
