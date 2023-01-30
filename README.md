# Just another simple Karel robot

This project provides a command-line-interface (CLI) or a html interface (WEB).

The Pixel Art was created by https://www.fiverr.com/pixelquato

## Running WEB

You can either access the web version at https://oglimmer.github.io/karel-robot-js/ or run it yourself:

```bash
docker run --rm -it -v $(pwd)/src:/usr/share/nginx/html:ro -p 8080:80 nginx
```


## Preperation for CLI

You need to have nodejs installed. I've tested it with Nodejs V18.

```bash
npm ci
```

## Running CLI

```bash
echo '
wiederhole solange nicht haus
  wenn ist zufall
    links-wendung
  ende, sonst
    schritt
  ende
ende
'|node src/cli.js
```

you can also create a text file (code.txt) and put the commands into it, then run it via:

```bash
cat code.txt | node src/cli.js
```

you can also change the delay between 2 steps and the initial board configuration:

```bash
cat code.txt | node src/cli.js --field '{"walls":[[3,3],[3,4],[3,5]],"packages":[[7,7,2]],"home":[9,9],"meeple":[9,0]}' --d 100
```

# Syntax

The syntax consists of commands and blocks.

## block:

A block is one or more commands

## command:

![command](docs/command.svg)


## example

```
lerne linkssonstzufall
  wenn ist zufall
    links-wendung
  ende, sonst
    schritt
  ende
ende
wiederhole solange nicht haus
  linkssonstzufall
ende
wiederhole 4-mal
  wenn nicht osten
    schritt
    log "move east"
  ende
ende
say "we have done it!"
```
