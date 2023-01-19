import { onMounted, getCurrentInstance  } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'
import { parse, Playfield, Field, Meeple } from './interpreter.js'

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
                const root = parse(this.code);
                await root.run(this.playfield);
            } catch (err) {
                alert(err)
            }
        }
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
    template: `<div>
        <div class="container">
            <UIField v-for="f in uiField" :key="f.id" :id="f.id"
                :selected="f.id===selectedId" :clicked="clickedOnField"
                :house="f.isHome()" :wall="f.isWall()" :packages="f.packages" :meeple="f.getMeepleDirection()" />
        </div>
        <div>
            <button @click="makeHome">Make Home</button>
            <button @click="toggleWall">Toggle Wall</button>
            <button @click="incPackage">Package++</button>
            <button @click="decPackage">Package--</button>
            <button @click="putMeeble">Meeple</button>
        </div>
        <div>
            <button @click="runCode">Run Code</button>
        </div>
        <div>
            <textarea v-model="code" style="width:400px;height:600px"></textarea>
        </div>
    </div>`
}
