# 🌟 Setting up and launching the project:

## The basic stuff:
- Clone the repository
- Install [Firebase CLI](https://github.com/firebase/firebase-tools?tab=readme-ov-file#installation)
- Install [Bun.js](https://bun.sh/docs/installation) <img src="https://github.com/onkr0d/cs-411-project/assets/90716666/02c693bc-f3f2-4710-86df-0452cef12ca1" width="10"/>, which is used in place of npm (because it's way faster)
- Install the required dependencies with ``npm install`` in the ``web/`` and ``functions/`` folder. You should be able to ignore the other ``npm install <library>`` mentioned below, but those are provided just in case.
  
## Plaid && ChatGPT  
- Install openai API with ``npm install --save openai``. 
- Get API keys from your OpenAI Project, which can be created [here.](https://platform.openai.com/overviewh)
- Install Plaid API with ``npm install plaid`` and get API keys from your Plaid Project
- Get API keys from your Plaid Project, which can be created [here.](https://plaid.com/docs/)
  
## Firebase:
- Install ``firebase`` and ``firebase-tools`` using ``npm install -g <library_name>``.
- Run ``firebase login`` to log in to your Firebase account.
- Create a new project in the [Firebase Console](https://console.firebase.google.com/).
- Set up all necessary services (Firestore, Functions, Hosting, Auth, AppCheck) on the Firebase Console.
- Make sure you populate all ``.example.env`` files with the legitimate credentials 🔑

## Launch locally:
- Firebase provides an emulator suite, but support for our tooling (Next.js) is experimental ⚠️:
    - We must run the emulator from the ``web/`` folder
    - We must run ``bun lint --fix && bun run build`` in the ``functions/`` folder to build and update the functions
- To run the emulator, run ``firebase emulators:start`` in ``web/``.

Enjoy! 🚀
