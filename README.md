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

you can also change the delay between 2 steps and the initial board configuration:

```bash
cat code.txt | node src/index.js --field '{"walls":[[3,3],[3,4],[3,5]],"packages":[[7,7,2]],"home":[9,9],"meeple":[9,0]}' --d 100
```
