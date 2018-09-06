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
    } else if (this.is('[]{},:.()')) {
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

  var token = {
    text: text,
    value: text,
    identifier: true
  };

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
AST.Identifier = 'Identifier';
AST.ThisExpression = 'ThisExpression';
AST.MemberExpression = 'MemberExpression';
AST.CallExpression = 'CallExpression';

AST.prototype.constants = {
  'null' : {type: AST.Literal, value: null},
  'true' : {type: AST.Literal, value: true},
  'false': {type: AST.Literal, value: false},
  'this': {type: AST.ThisExpression}
}

AST.prototype.ast = function(text) {
  this.tokens = this.lexer.lex(text);
  return this.program();
}

AST.prototype.program = function(){
  return {type: AST.Program, body: this.primary()};
}

AST.prototype.primary = function(){
  var primary;
  if (this.expect('[')) {
    primary = this.arrayDeclaration();
  } else if(this.expect('{')) {
    primary = this.object();
  } else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
    primary = this.constants[this.consume().text];
  } else if (this.peek().identifier) {
    primary = this.identifier();
  } else {
    primary = this.constant();
  }

  var next;

  while ((next = this.expect('.', '[', '('))) {
    if (next.text === '[') {
      primary = {
        type: AST.MemberExpression,
        object: primary,
        property: this.primary(),
        computed: true
      }
      this.consume(']');
    } else if (next.text === '.') {
      primary = {
        type: AST.MemberExpression,
        object: primary,
        property: this.identifier(),
        computed: false
      }
    } else if (next.text  === '(') {
      primary = {
        type: AST.CallExpression,
        callee: primary,
        arguments: this.parseArguments()
      };
      this.consume(')');
    }
  }

  return primary;
}

AST.prototype.parseArguments = function() {
  var args = [];
  if (!this.peek(')')) {
    do {
      args.push(this.primary());
    } while (this.expect(','));
  }

  return args;
}

AST.prototype.object = function(){
  var properties = [];
  if(!this.peek('}')) {
    do {
      var property = {type: AST.Property};
      if (this.peek().identifier) {
        property.key = this.identifier();
      } else {
        property.key = this.constant();
      }
      this.consume(':');
      property.value = this.primary();
      properties.push(property);
    } while (this.expect(','))
  }
  this.consume('}');
  return {type: AST.ObjectExpression, properties: properties};
}

AST.prototype.identifier = function() {
  return {type: AST.Identifier, name: this.constant().value};
}

AST.prototype.expect = function(e1, e2, e3, e4) {
  var token = this.peek(e1, e2, e3, e4);
  if (token) {
    return this.tokens.shift();
  }
}

AST.prototype.consume = function(e1, e2, e3, e4) {
  var token = this.expect(e1, e2, e3, e4);

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

AST.prototype.peek = function(e1, e2, e3, e4) {
  if(this.tokens.length > 0) {
    var text = this.tokens[0].text;
    if ((text === e1 || text === e2 || text === e3 || text === e4) || (!e1 && !e2 && !e3 && !e4)) {
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
  this.state = {body: [], nextId: 0, vars: []};
  this.recurse(ast);

  var fn = new Function('s', 'l',
    (this.state.vars.length ?
      'var ' + this.state.vars.join(',') + ';' : '') +
      this.state.body.join(''));
  return fn;
}

ASTCompiler.prototype.nextId = function(){
  var id = 'v' + (this.state.nextId++);
  this.state.vars.push(id);
  return id;
}

ASTCompiler.prototype.recurse = function(ast, context) {
  var intoId;
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
        var key = property.key.type === AST.Identifier ?
          property.key.name : this.escape(property.key.value);
        var value = this.recurse(property.value);
        return key + ':' + value;
      }.bind(this));
      return '{' + properties.join(',') + '}';
    case AST.Identifier:
      intoId = this.nextId();
      this.if_(this.getHasOwnProperty('l', ast.name),
        this.assign(intoId, this.nonComputerMember('l', ast.name)));
      this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s',this.assign(intoId, this.nonComputerMember('s', ast.name)));

      if (context) {
        context.context = this.getHasOwnProperty('l', ast.name) + '?l:s';
        context.name = ast.name;
        context.computed = false;
      }

      return intoId;
    case AST.ThisExpression:
      return 's';
    case AST.MemberExpression:
      intoId = this.nextId();
      var left = this.recurse(ast.object);

      if (context) {
        context.context = left;
      }

      if (ast.computed) {
        var right = this.recurse(ast.property);
        this.if_(left,
          this.assign(intoId, this.computedMember(left, right)));
        if (context) {
          context.name = right;
          context.computed = true;
        }
      } else {
        this.if_(left,
          this.assign(intoId, this.nonComputerMember(left, ast.property.name)));
        if (context) {
          context.name = ast.property.name;
          context.computed = false;
        }
      }
      return intoId;
    case AST.CallExpression:
      var callContext = {};
      var callee = this.recurse(ast.callee, callContext);
      var args = _.map(ast.arguments, function(arg) {
        return this.recurse(arg);
      }.bind(this));

      if (callContext.name) {
        if (callContext.computed) {
          callee = this.computedMember(callContext.context, callContext.name);
        } else {
          callee = this.nonComputerMember(callContext.context, callContext.name);
        }
      } else {

      }
      return callee + ' && ' + callee + '('+args.join(',')+')';
  }
}

ASTCompiler.prototype.computedMember = function(left, right) {
  return '('+left+')['+right+']';
}

ASTCompiler.prototype.getHasOwnProperty = function(obj, attr) {
  return obj + ' && ( ' + this.escape(attr) + ' in ' + obj + ')';
}

ASTCompiler.prototype.not = function(e) {
  return '!(' + e + ')';
}

ASTCompiler.prototype.assign = function(id, value) {
  return id + '=' + value;
}

ASTCompiler.prototype.if_ = function(test, consequent) {
  this.state.body.push('if(',test,'){',consequent,'}');
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

ASTCompiler.prototype.nonComputerMember = function(left, right) {
  return '(' + left + ').' + right;
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
