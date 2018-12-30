import { Token, TokenKind, TokenKindEnum } from 'graphql';

const ignoreTokens = new Set<TokenKindEnum>([
  TokenKind.BLOCK_STRING,
  TokenKind.STRING,
  TokenKind.COMMENT,
]);

function getRealDefinitionFirstToken(first: Token): Token {
  let token: Token | null = first;
  while (token && ignoreTokens.has(token.kind)) {
    token = token.next;
  }

  if (!token) {
    // safety hatch
    return first;
  }

  return token;
}

export default getRealDefinitionFirstToken;
