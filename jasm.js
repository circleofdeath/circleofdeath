const TYPE_NULL   = 0;
const TYPE_NUMBER = 1;
const TYPE_STRING = 2;
const TYPE_OBJECT = 3;
const TYPE_BOOL   = 4;

const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_FAILURE = 1;
const EXIT_CODE_RAV_404 = 2;
const EXIT_CODE_RBV_404 = 3;

let asm_vars = {};
let commands = {};
let asm_commands = {};

class AssemblyContext {
    constructor() {
        this.rav = undefined; // Registry Accumulator Variable
        this.rbv = undefined; // Registry Base Variable
        this.rcv = undefined; // Registry Counter Variable
        this.rdv = undefined; // Registry Data Variable

        this.rav_type = TYPE_NULL;
        this.rbv_type = TYPE_NULL;
        this.rcv_type = TYPE_NULL;
        this.rdv_type = TYPE_NULL;

        this.lines = [];
        this.gotos = {};
        this.pointer = 0;
    }

    readLine(line) {
        if(line.endsWith(':') && !line.includes(' ')) {
            this.gotos[line.substring(0, line.length - 1)] = this.pointer;
            return;
        }

        let cmd = line.substring(0, line.indexOf(' '));
        line = line.substring(line.indexOf(' '));        
        let args = line.split(', ').map(arg => arg.replace(',\\', ',').trim());
        asm_commands[cmd](this, args);
    }

    run() {
        this.pointer = 0;
        while(this.pointer < this.lines.length) {
            this.readLine(this.lines[this.pointer]);
            this.pointer++;
        }
    }

    exit(code) {
        if(code !== 0) {
            console.log(`Failed with code: ${code}`);
        }

        this.pointer = this.lines.length;
    }
}

commands['0x90'] = function(asm) {
    asm.rav = asm.raw[asm.rbv];
};

commands['0x80'] = function(asm) {
    if(asm.rav === 0) {                         // SYS_EXIT
        asm.exit(asm.rbv);
    } else if(asm.rav === 1) {                  // SYS_LOG
        if(asm.rbv === 0) {
            console.log(asm.rcv);               // LOG INFO
        } else if(asm.rbv === 1) {
            console.warn(asm.rcv);              // LOG WARN
        } else if(asm.rbv === 2) {
            console.error(asm.rcv);             // LOG ERROR
        } else if(asm.rbv === 3) {
            asm_vars['page'].innerHTML += asm.rcv; // LOG STDOUT
        } else {
            asm.exit(EXIT_CODE_RBV_404);
        }
    } else {                                    // SYS_ERROR_404
        asm.exit(EXIT_CODE_RAV_404);
    }
};

asm_commands['adg'] = function(asm, args) {
    let [key, value] = [args[0], args[1]];

    if(value === "rav") {
        value = asm.rav;
    } else if(value === "rbv") {
        value = asm.rbv;
    } else if(value === "rcv") {
        value = asm.rcv;
    } else if(value === "rdv") {
        value = asm.rdv;
    } else {
        value = asm_vars[value];
    }

    if(key === "rav") {
        asm.rav += value;
    } else if(key === "rbv") {
        asm.rbv += value;
    } else if(key === "rcv") {
        asm.rcv += value;
    } else if(key === "rdv") {
        asm.rdv += value;
    } else {
        asm_vars[key] += value;
    }
}

asm_commands['add'] = function(asm, args) {
    let [key, value] = [args[0], args[1]];

    if(key === "rav") {
        asm.rav += value;
    } else if(key === "rbv") {
        asm.rbv += value;
    } else if(key === "rcv") {
        asm.rcv += value;
    } else if(key === "rdv") {
        asm.rdv += value;
    } else {
        asm_vars[key] += value;
    }
}

asm_commands['mov'] = function(asm, args) {
    let [key, type, value] = [args[0], args[1], args[2]];

    if(type === `${TYPE_NULL}`) {
        value = undefined;
        type = TYPE_NULL;
    } else if(type === `${TYPE_NUMBER}`) {
        value = +value;
        type = TYPE_NUMBER;
    } else if(type === `${TYPE_STRING}`) {
        type = TYPE_STRING;
    } else if(type === `${TYPE_OBJECT}`) {
        value = asm_vars[value];
        type = TYPE_OBJECT;
    } else if(type === `${TYPE_BOOL}`) {
        value = value === 'true' || value === '1';
        type = TYPE_BOOL;
    } else if(type === "rav") {
        value = asm.rav;
        type = asm.rav_type;
    } else if(type === "rbv") {
        value = asm.rbv;
        type = asm.rbv_type;
    } else if(type === "rcv") {
        value = asm.rcv;
        type = asm.rcv_type;
    } else if(type === "rdv") {
        value = asm.rdv;
        type = asm.rdv_type;
    } else {
        value = asm_vars[type];
        type = TYPE_OBJECT;
    }

    switch(key) {
        case 'rav':
            asm.rav = value;
            asm.rav_type = type;
            break;
        case 'rbv':
            asm.rbv = value;
            asm.rbv_type = type;
            break;
        case 'rcv':
            asm.rcv = value;
            asm.rcv_type = type;
            break;
        case 'rdv':
            asm.rdv = value;
            asm.rdv_type = type;
            break;
        default:
            asm_vars[key] = value;
    }
};

asm_commands['int'] = function(asm, args) {
    commands[args[0]](asm);
};

asm_commands['goto'] = function(asm, args) {
    asm.pointer = asm.gotos[args[0]];
};

asm_vars['win'] = window;
asm_vars['doc'] = document;
asm_vars['page'] = document.getElementById("asm_stdout");

async function read(file) {
    const response = await fetch(file);
        
    if(!response.ok) {
        console.error(`Failed to load ${file}`);
        return '';
    }

    return await response.text();
}

async function load(package) {
    const context = await read(`${package}.jasm`);
    let ctx = new AssemblyContext();
    ctx.lines = context
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !line.startsWith(';'));

    try {
        ctx.run();
    } catch(err) {
        console.error(`Failed to run ${package}.jasm: ${err}`);
    }
}