class State {
    private readonly spread = 500;
    positions: Record<number, number>;
    endIndex = 3508; // Maximum position index
    percentChance = 25; // 25% chance to modify position
    multiSection: boolean = false; // Whether to use multiple sections
    randomized: boolean = true;

    constructor() {
        this.positions = this.initializePositions(this.randomized);
    }

    private initializePositions(randomized: boolean = false): Record<number, number> {
        const positions: Record<number, number> = {};
        for (let i = 1; i <= 4; i++) {
            if (randomized) {
                const randomStart = Math.floor(Math.random() * this.endIndex) + 1;
                positions[i] = randomStart;
            } else {
                positions[i] = positions[i] + 1 > this.endIndex ? 1 : positions[i] + 1;
            }
        }
        return positions;
    }
    set setMultiSection(value: boolean) {
        this.multiSection = value;
    }

    get getMultiSection() {
        return this.multiSection;
    }

    modifyPosition(section: number, randomize: boolean = false): void {
        if (!(section in this.positions)) {
            console.warn(`Section ${section} does not exist.`);
            return;
        }

        if (randomize) {
            console.log(true);

            const roll = Math.random() * 100;
            if (roll < this.percentChance) {
                const newValue = Math.floor(Math.random() * this.endIndex) + 1;
                this.positions[section] = newValue;
                return;
            }
        }

        this.positions[section] += 1;
    }
}

export default State;

