const { inspect } = require("util");


////////////////////////
//                    //
//     Tokenizer      //
//                    //
////////////////////////

function stringToTokens(input) {
  // Define the shape of tokens to look for.
  // We're using regexps for this because they're good/quick for simple
  // tokenizers; this isn't how all compilers are written. :'D
  //
  // EXERCISE:
  // Add the rest of the token types to this list to support
  // tokenising the statement "add(1, 2);".
  // (More token types can go above and below the existing rules.)
  const tokenizerRules = [
    {
      regex: /\(/,
      token: "parenOpen"
    },
    {
      regex: /\)/,
      token: "parenClose"
    },
    {
      regex: /,/,
      token: "comma"
    },
    {
      regex: /;/,
      token: "semicolon"
    },
    {
      regex: /([0-9])+/,
      token: "literalNumber"
    },
    {
      // This (...) business is to "capture" a chunk of text.
      // We didn't care about this for parenOpen, but we want
      // to keep what the identifier text is.
      regex: /([a-z][a-zA-Z0-9]*)/,
      token: "identifier"
    },
  ];

  // A function that attempts to figure out what the next chunk
  // of the code is. It looks through the above rules, and tries
  // each in sequence; if no rules match, it has a whinge.
  function getNextToken(input) {
    for (let i = 0; i < tokenizerRules.length; i++) {
      const rule = tokenizerRules[i];
      const matches = input.match(
        new RegExp(`^${rule.regex.source}`)
      );
      if (matches !== null) {
        return {
          remaining: input.slice(matches[0].length),
          newToken: {
            // Which rule did we match? eg. parenOpen
            type: rule.token,
            // If we captured something, store it:
            capture: matches[1]
          }
        };
      }
    }
    throw new Error(`Unrecognised input: ${input}`);
  }

  // Go!
  // We're cheating here by just flat-out ignoring whitespace: both
  // at the beginning (trimLeft), and on every loop.
  // A lot of languages can mostly ignore it, but you can't do this
  // for, say, Python or Ruby.
  let tokens = [];
  let remaining = input.trimLeft();
  while (remaining.length > 0) {
    const result = getNextToken(remaining);
    remaining = result.remaining.trim();
    tokens.push(result.newToken);
  }
  return tokens;
}


////////////////////////
//                    //
//    Token Parser    //
//                    //
////////////////////////

function tokensToAst(inputTokens) {
  // Create a copy of the input; we're going to muck around with it
  // in here, and we don't want to surprise whoever called us.
  const tokens = inputTokens.slice(0);

  // ...

  // AST node creators
  const programNode = (declarations, returningExpression) => ({
    type: "programNode",
    declarations,
    returningExpression
  });
  const numberNode = num => ({
    type: "numberNode",
    number: num
  });
  const functionCallNode = (functionIdentifier, args) => ({
    type: "functionCallNode",
    functionIdentifier,
    args
  });
  const variableReferenceNode = (identifier) => ({
    type: "variableReferenceNode",
    identifier
  });

  function consume(tokenType) {
    const token = tokens.shift();
    if (token && token.type === tokenType) {
      return token;
    } else {
      throw new Error(`Expected token ${tokenType}, got: ${inspect(token)}`);
    }
  }

  function parseReturningExpression() {
    // Take the first token, the "add" identifier, and grab its captured name.
    const identifier = consume("identifier").capture;

    // Token the next token, the open parens; throw away the token,
    // we don't need it anymore.
    consume("parenOpen");

    // EXERCISE:
    // Consume exactly the tokens needed to parse the rest of the exact
    // statement "add(1, 2);", and nothing else. Don't worry about
    // looping or conditions or anything; we'll get onto that next.
    const first = parseInt(consume("literalNumber").capture, 10);
    consume("comma");
    const second = parseInt(consume("literalNumber").capture, 10);
    consume("parenClose");
    consume("semicolon");

    // TODO: Replace this with:
    //       ... = functionCallNode(identifier, args);
    return functionCallNode(
      identifier,
      [ numberNode(first), numberNode(second) ]
    );
  }

  function parseProgram() {
    const declarations = [];
    const returningExpression = parseReturningExpression();
    if (tokens.length != 0) {
      throw new Error(`There are still unprocessed tokens left! ${inspect(tokens)}`);
    }
    return programNode(declarations, returningExpression);
  }

  return parseProgram();
};


////////////////////////
//                    //
//   Code Generator   //
//                    //
////////////////////////

function astToJs(ast) {
  switch (ast.type) {
    case "programNode":
      return `
        var result = (function(){
          return null;
        })();
        console.log(result);
      `;
    default:
      throw new Error(`Unknown type ${ast.type} for AST chunk: ${inspect(ast)}`);
  }
}



/////////////////////////////
//                         //
//   Let's Run The Thing   //
//                         //
/////////////////////////////

const input = `
  add(1, 2);
`.trim();
const tokens = stringToTokens(input);
const ast = tokensToAst(tokens);

const runtime = `
  function add(x,y) { return x + y; };
`;
const generated = astToJs(ast);
const js = runtime + "\n" + generated;

console.log("TOKENS:\n", tokens, "\n");
console.log("AST:\n", inspect(ast), "\n");
console.log("JS:\n", js, "\n");

console.log("EVAL:");
(function(){ eval(js); })();
