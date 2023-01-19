// ************************************************************************
/* READ CODE FROM STDIN */

import readline from 'readline';
import {parse, Playfield, Meeple, Field, DELAY} from './interpreter.js';

// this will collect all input from stdin as Array<string>
const input = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    input.push(line);
});

rl.once('close', () => {
    main(input);
});

// ************************************************************************
/* main */

async function main(input) {
    const playfield = new ConsolePlayfield(10, 10, ConsoleField);
    const dParamIndex = process.argv.findIndex(e => e === "--d")
    if (dParamIndex > -1) {
        DELAY.value = parseInt(process.argv[dParamIndex + 1]);
    }
    let home = [5,5];
    let meepleStart = [0,0];
    const dFieldIndex = process.argv.findIndex(e => e === "--field")
    if (dFieldIndex > -1) {
        const fieldCondig = JSON.parse(process.argv[dFieldIndex + 1]);
        if (fieldCondig.walls) {
            fieldCondig.walls.forEach(e => {
                playfield.getField(e[0], e[1]).content = Field.WALL;
            })
        }
        if (fieldCondig.packages) {
            fieldCondig.packages.forEach(e => {
                playfield.getField(e[0], e[1]).packages = e[2];
            })
        }
        if (fieldCondig.home) {
            home = fieldCondig.home;
        }
        if (fieldCondig.meeple) {
            meepleStart = fieldCondig.meeple
        }
    }
    playfield.getField(home[0], home[1]).content = Field.HOME;
    new Meeple(playfield.getField(meepleStart[0], meepleStart[1]), playfield); // registers itself to the playfield

    try {
        const root = parse(input);
        await root.run(playfield);
    } catch (err) {
        console.error(err);
    }
}

// ************************************************************************
/* ConsoleUI */

class ConsoleField extends Field {
    getContent() {
        if (this.playfield.getMeeple().getField() === this) {
            switch (this.playfield.getMeeple().direction) {
                case Meeple.NORTH:
                    return "^"
                case Meeple.EAST:
                    return ">"
                case Meeple.SOUTH:
                    return "v"
                case Meeple.WEST:
                    return "<"
            }
        }
        switch (this.content) {
            case Field.HOME:
                return "H"
            case Field.WALL:
                return "W"
            default:
                return " "
        }
    }
}

class ConsolePlayfield extends Playfield {
    print() {
        console.clear();
        let buff = "";
        for (let iy = 0; iy < this.y; iy++) {
            buff += `---------------------------------------------------\n`
            // for (let ix = 0 ; ix < this.x ; ix++ ) {
            //   const field = this.getField(ix, iy);
            //   buff += `| ${field.x}:${field.y}`
            // }
            // buff += `|\n`
            for (let ix = 0; ix < this.x; ix++) {
                const field = this.getField(ix, iy);
                buff += `| ${field.getContent()} ${field.packages > 0 ? field.packages : " "}`
            }
            buff += `|\n`
        }
        buff += `---------------------------------------------------\n`
        console.log(buff);
    }
}



