import { onMounted, getCurrentInstance  } from './vue.js'
import {parse, Playfield, Field, Meeple, BaseCommand} from './interpreter.js'
import hljs from './highlight/highlight.js';
import karel from './highlight/languages/karel.min.js'
hljs.registerLanguage('karel', karel);

class HtmlField extends Field {

    get id() {
        return this.x + 10*this.y;
    }

    getMeepleDirection() {
        if (!this.isMeeple()) {
            return ""
        }
        switch (this.playfield.getMeeple().direction) {
            case Meeple.NORTH:
                return "^";
            case Meeple.EAST:
                return ">";
            case Meeple.SOUTH:
                return "v";
            case Meeple.WEST:
                return "<";
        }
    }
}

export const UIFieldView = {
    props: [
        "id",
        "selected",
        "clicked",
        "house",
        "wall",
        "packages",
        "meeple"
    ],
    methods: {
        onClicked() {
            this.clicked(this.id)
        }
    },
    computed: {
        dynamicClasses() {
            return this.selected?["selected"]:[]
        }
    },
    template: `<div class="box" :class="dynamicClasses" @click="onClicked">
        {{ house? "H" : "" }}
        {{ wall? "W" : "" }}
        {{ packages? packages : "" }}
        {{ meeple? meeple : "" }}
    </div>`
}

export const rootComponent = {
    data() {
        return {
            uiField: [],
            playfield: null,
            selectedId: false,
            running: false,
            code: "wiederhole solange nicht haus\n" +
                "  wenn ist zufall\n" +
                "    links-wendung\n" +
                "  ende, sonst\n" +
                "    schritt\n" +
                "  ende\n" +
                "  aufheben\n" +
                "  wenn ist norden\n" +
                "    platzieren\n" +
                "  ende\n" +
                "ende\n" +
                "say \"ich bin am ziel\"\n"
        }
    },
    methods: {
        clickedOnField(id) {
            if (this.selectedId === id ) {
                this.selectedId = false
            } else {
                this.selectedId = id;
            }
        },
        makeHome() {
            if (this.selectedId !== false) {
                this.uiField.forEach(e => e.clearFlag(Field.HOME))
                this.uiField.filter(e => e.id === this.selectedId).forEach(e => e.setFlag(Field.HOME))
            }
        },
        toggleWall() {
            if (this.selectedId !== false) {
                this.uiField.filter(e => e.id === this.selectedId).forEach(e => e.toggleFlag(Field.WALL))
            }
        },
        putMeeble() {
            if (this.selectedId !== false) {
                this.uiField.filter(e => e.id === this.selectedId).forEach(e => {
                    if(e.isMeeple()) {
                        this.playfield.getMeeple().turnLeft();
                    } else {
                        e.setMeeple();
                    }
                });
            }
        },
        incPackage() {
            if (this.selectedId !== false) {
                this.uiField.filter(e => e.id === this.selectedId).forEach(e => e.packages = Math.min(8, e.packages+1))
            }
        },
        decPackage() {
            if (this.selectedId !== false) {
                this.uiField.filter(e => e.id === this.selectedId).forEach(e => e.packages = Math.max(0, e.packages-1))
            }
        },
        async runCode() {
            try {
                this.running = true;
                BaseCommand.abort = false;
                const root = parse(this.code);
                await root.run(this.playfield);
            } catch (err) {
                alert(err)
            } finally {
                this.running = false;
            }
        },
        stopCode() {
            BaseCommand.abort = true;
        },
        highlighter(code) {
            return hljs.highlight(code, {language: 'karel'}).value
        },
    },
    setup() {
        onMounted(() => {
            const playfield = new Playfield(10, 10, HtmlField);
            getCurrentInstance().data.playfield = playfield;
            playfield.fields.forEach(e => {
                getCurrentInstance().data.uiField.push(e);
            });
            new Meeple(playfield.fields[0], playfield);
            playfield.fields[3].setFlag(Field.WALL);
            playfield.fields[13].setFlag(Field.WALL);
            playfield.fields[23].setFlag(Field.WALL);
            playfield.fields[33].setFlag(Field.WALL);
            playfield.fields[43].setFlag(Field.WALL);
            playfield.fields[55].packages = 2;
            playfield.fields[99].setFlag(Field.HOME);
        })
    },
    template: `<div class="row">
        <div class="container column">
            <UIField v-for="f in uiField" :key="f.id" :id="f.id"
                :selected="f.id===selectedId" :clicked="clickedOnField"
                :house="f.isHome()" :wall="f.isWall()" :packages="f.packages" :meeple="f.getMeepleDirection()" />
        </div>
        <div class="column">
            <div>
                <button @click="makeHome">Make Home</button>
                <button @click="toggleWall">Toggle Wall</button>
                <button @click="incPackage">Package++</button>
                <button @click="decPackage">Package--</button>
                <button @click="putMeeble">Meeple</button>
            </div>
            <div>
                <prism-editor class="my-editor" v-model="code" :highlight="highlighter" line-numbers></prism-editor>
            </div>
            <div>
                <button @click="runCode" v-if="!running">Run Code</button>
                <button @click="stopCode" v-if="running">Stop</button>
            </div>
        </div>
    </div>`
}
