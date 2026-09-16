#!/usr/bin/env node

/**
 * Turns an admin password into the bcrypt hash that ADMIN_PASSWORD_HASH holds.
 *
 *   npm run hash-admin-password
 *
 * The password is typed at a prompt rather than passed as an argument, and
 * that is the point of the script existing at all. An argument ends up in the
 * shell history file, in the process list while it runs, and in the terminal
 * scrollback — three places the password was never meant to reach. Typed here
 * it is echoed nowhere, lives in one process, and is gone when it exits.
 *
 * Only the hash is printed. Paste that into ADMIN_PASSWORD_HASH; the password
 * itself is never written down anywhere by this script.
 */

import { Writable } from "node:stream";
import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";

/**
 * bcrypt's work factor.
 *
 * Twelve is roughly a quarter-second per comparison on a small serverless CPU.
 * That is imperceptible on the one login this dashboard ever performs, and it
 * multiplies the cost of an offline attack on a leaked hash by four thousand
 * over the old default of 10. Raise it and existing hashes keep working — the
 * cost is stored inside the hash, so only newly generated ones change.
 */
const COST = 12;

/** Short enough to be guessed is short enough to refuse. */
const MIN_LENGTH = 12;

/** Reads one line with the echo turned off. */
function askSecret(prompt) {
  return new Promise((resolve) => {
    let muted = false;

    /*
      Everything readline wants to print goes through here. The prompt is
      written before muting starts; every keystroke echoed afterwards is
      swallowed, which is what keeps the password off the screen and out of
      the scrollback.
    */
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding);
        }

        callback();
      },
    });

    const rl = createInterface({
      input: process.stdin,
      output,
      terminal: true,
    });

    rl.question(prompt, (answer) => {
      rl.close();
      /* The newline the user's Enter would have echoed, had echo been on. */
      process.stdout.write("\n");
      resolve(answer);
    });

    muted = true;
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    console.error(
      "This script needs an interactive terminal so the password is never echoed or piped.",
    );
    process.exit(1);
  }

  console.log("Lifafa — admin password hash\n");

  const password = await askSecret("New admin password: ");

  if (password.length < MIN_LENGTH) {
    console.error(
      `\nThat is ${password.length} characters. Use at least ${MIN_LENGTH}.`,
    );
    process.exit(1);
  }

  /*
    Asked twice, because a typo here is not discovered until the hash is
    deployed and the real password no longer opens the door — at which point
    the only way back in is another deploy.
  */
  const again = await askSecret("Type it again: ");

  if (again !== password) {
    console.error("\nThose did not match. Nothing was generated.");
    process.exit(1);
  }

  const digest = await hash(password, COST);

  console.log("\nPaste this into your environment:\n");
  console.log(`ADMIN_PASSWORD_HASH=${digest}\n`);
  console.log(
    "On Vercel it goes in Project Settings -> Environment Variables. Locally it goes in .env.local.",
  );
  console.log(
    "Quote it if your shell or editor would otherwise treat $ specially.\n",
  );
  console.log(
    "You also need ADMIN_USERNAME, and an ADMIN_SESSION_SECRET of at least 32 characters.",
  );
  console.log("A fresh one, if you need it:\n");
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}\n`);
}

main().catch((cause) => {
  console.error("Could not generate the hash:", cause);
  process.exit(1);
});
