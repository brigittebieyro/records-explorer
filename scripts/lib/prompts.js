/**
 * Terminal prompts for the setup and password scripts.
 *
 * promptHidden reads raw keystrokes so the typed text is never shown. createPrompter wraps
 * readline for everything else; close it before calling promptHidden, since both read stdin.
 */

const readline = require('readline/promises');

function promptHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();

    let input = '';
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          finish();
          resolve(input);
          return;
        }
        if (char === '\u0003') {
          finish();
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          input = input.slice(0, -1);
        } else {
          input += char;
        }
      }
    };
    stdin.on('data', onData);
  });
}

/**
 * @param {() => void} onCancel called on Ctrl+C. Without a SIGINT listener readline only pauses,
 *   which would leave the pending question unanswered forever.
 */
function createPrompter(onCancel) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('SIGINT', onCancel);

  /**
   * Asks until `validate` returns no error. `validate` gets the trimmed answer (or the default when
   * the answer is blank) and returns an error message, or undefined when the answer is usable.
   */
  async function ask(question, { defaultValue, validate } = {}) {
    const suffix = defaultValue !== undefined && defaultValue !== '' ? ` [${defaultValue}]` : '';
    for (;;) {
      const raw = (await rl.question(`${question}${suffix}: `)).trim();
      const answer = raw === '' && defaultValue !== undefined ? defaultValue : raw;
      const error = validate ? validate(answer) : undefined;
      if (!error) return answer;
      console.log(`  ${error}`);
    }
  }

  async function askYesNo(question) {
    const answer = await ask(`${question} (y/n)`, {
      validate: (value) => (/^(y|yes|n|no)$/i.test(value) ? undefined : 'Please answer y or n.'),
    });
    return /^y/i.test(answer);
  }

  return { ask, askYesNo, close: () => rl.close() };
}

module.exports = { promptHidden, createPrompter };
