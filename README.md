# Just another simple Karel robot

## Preperation

You need to have nodejs installed. I've tested it with Nodejs V18.

```bash
npm ci
```

## Running it

```bash
echo '
wiederhole solange nicht haus
  wenn ist zufall
    links-wendung
  ende, sonst
    schritt
  ende
ende
'|node src/index.js
```

you can also create a text file (code.txt) and put the commands into it, then run it via:

```bash
cat code.txt | node src/index.js
```

you can use the environment variable DELAY to change the delay in millis between each step.

```bash
cat code | DELAY=1000 node src/index.js
```
