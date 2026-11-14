/**
 * Google sign-in for command-line scripts: the OAuth 2.0 loopback flow for desktop apps, with PKCE,
 * using only Node built-ins.
 *
 * A one-time local web server on 127.0.0.1 receives Google's redirect after the person approves
 * access in their browser. The access token is returned to the caller and never written to disk.
 *
 * https://developers.google.com/identity/protocols/oauth2/native-app
 */

const crypto = require('crypto');
const http = require('http');
const { spawn } = require('child_process');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

const SCOPES = {
  // Create spreadsheets and add tabs to spreadsheets the person already has.
  spreadsheets: 'https://www.googleapis.com/auth/spreadsheets',
  // Change sharing on spreadsheets this app created.
  driveFile: 'https://www.googleapis.com/auth/drive.file',
};

const base64Url = (buffer) => buffer.toString('base64url');

/** Opens `url` in the default browser. Failure is ignored: the URL is also printed. */
function openInBrowser(url) {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')]]
        : ['xdg-open', [url]];
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    // The printed link still works.
  }
}

const RESPONSE_PAGE = (message) =>
  `<!doctype html><meta charset="utf-8"><title>Records Explorer setup</title>` +
  `<body style="font-family: sans-serif; padding: 2rem"><p>${message}</p></body>`;

/**
 * Waits for Google's redirect on a local port.
 * @returns {Promise<{ redirectUri: string, code: Promise<string>, close: () => void }>}
 */
function startRedirectListener(expectedState) {
  return new Promise((resolveListener, rejectListener) => {
    let resolveCode;
    let rejectCode;
    const code = new Promise((resolve, reject) => {
      resolveCode = resolve;
      rejectCode = reject;
    });

    const server = http.createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname !== '/') {
        response.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      const returnedCode = url.searchParams.get('code');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (error) {
        response.end(RESPONSE_PAGE('Google sign-in was not completed. You can close this tab.'));
        rejectCode(
          new Error(
            error === 'access_denied'
              ? 'Google access was not allowed.'
              : `Google sign-in returned an error: ${error}`
          )
        );
      } else if (url.searchParams.get('state') !== expectedState || !returnedCode) {
        response.end(RESPONSE_PAGE('This sign-in link is out of date. Please return to the terminal.'));
        rejectCode(new Error('Google sign-in returned an unexpected response.'));
      } else {
        response.end(
          RESPONSE_PAGE('Signed in. You can close this tab and return to the terminal.')
        );
        resolveCode(returnedCode);
      }
    });

    const timer = setTimeout(
      () => rejectCode(new Error('Google sign-in timed out after 5 minutes.')),
      SIGN_IN_TIMEOUT_MS
    );
    const close = () => {
      clearTimeout(timer);
      server.close();
    };
    code.then(close, close);

    server.on('error', rejectListener);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveListener({ redirectUri: `http://127.0.0.1:${port}`, code, close });
    });
  });
}

/**
 * Signs the person in through their browser.
 *
 * @param {{ clientId: string, clientSecret: string, scopes: string[] }} options
 * @returns {Promise<string>} an access token holding every scope in `scopes`
 * @throws when the person declines, leaves out a scope, or the sign-in times out
 */
async function signIn({ clientId, clientSecret, scopes }) {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64Url(crypto.randomBytes(16));

  const listener = await startRedirectListener(state);
  const authUrl = new URL(AUTH_URL);
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: listener.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  }).toString();

  console.log('\nOpening Google sign-in in your browser. If it does not open, visit this link:');
  console.log(`\n  ${authUrl.toString()}\n`);
  console.log(
    'Google will warn that it "hasn\'t verified this app". That is expected: the app is your own\n' +
      'OAuth client. Choose "Advanced", then "Go to ... (unsafe)", then allow access.\n'
  );
  openInBrowser(authUrl.toString());

  let code;
  try {
    code = await listener.code;
  } finally {
    listener.close();
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: listener.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    const reason = body.error_description || body.error || `status ${response.status}`;
    throw new Error(`Google sign-in could not be completed (${reason}).`);
  }

  // Google lets people untick individual permissions on the consent screen.
  const granted = new Set(String(body.scope ?? '').split(' '));
  const missing = scopes.filter((scope) => !granted.has(scope));
  if (missing.length > 0) {
    throw new Error(
      'Google sign-in finished without every permission the setup needs. ' +
        'Please run it again and leave all the boxes ticked.'
    );
  }
  return body.access_token;
}

module.exports = { SCOPES, signIn };
