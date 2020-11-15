class Game {
	constructor(canvas) {
		window.game = this; // Console access

		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		// Parameters

		this.cols = 80;
		this.rows = 50;
		
		this.grid = null;
		this.gridTemp = null;

		this.running = false;

		this.tickRate = 24;
		this.timer = performance.now();

		this.generation = 0;

		this.selection = { active: false,col: -1, row: -1};
		this.editing = { active: false, value: null };

		this.style = { border: 1, size: 12 };
		this.color = {	 
			alive: "rgb(64, 64, 64)",
			dead: "rgb(247, 247, 247)",
			border: "rgb(196, 196, 196)",
			highlight: "rgb(223, 64, 16)"
		};

		// Functions

		this.init();

		window.requestAnimationFrame(() => { this.main(); }); // Start game
	}

	// Init

	init() {
		// Set UI values
		this.setTickRate(this.tickRate);
		this.setGeneration(this.generation);

		// Resize canvas
		this.canvas.width = this.cols * this.style.size + this.style.border;
		this.canvas.height = this.rows * this.style.size + this.style.border;

		// Create grid
		this.grid = Array.from(new Array(this.rows), () => new Array(this.cols).fill(false));
		this.gridTemp = Array.from(new Array(this.rows), () => new Array(this.cols).fill(false));

		// Setup event listeners
		/// Canvas
		this.canvas.addEventListener("mousemove", e => { this.handleMouseMove(e); });
		this.canvas.addEventListener("mousedown", e => { this.handleMouseDown(e); });
		this.canvas.addEventListener("mouseup", e => { this.handleMouseUp(e); });
		this.canvas.addEventListener("mouseover", e => { this.handleMouseOver(e); });
		this.canvas.addEventListener("mouseout", e => { this.handleMouseOut(e); });
		/// Controls
		document.getElementById("toggle").addEventListener("click", () => { this.toggleSimulation(); });
		document.getElementById("step").addEventListener("click", () => { this.update(); });
		document.getElementById("clear").addEventListener("click", () => { this.clearGrid(); });
		document.getElementById("fill").addEventListener("click", () => { this.fillGrid(); });
		document.getElementById("tickRatePlus").addEventListener("click", () => { this.setTickRate(this.tickRate + 1); });
		document.getElementById("tickRatePlusPlus").addEventListener("click", () => { this.setTickRate(this.tickRate + 10); });
		document.getElementById("tickRateMinus").addEventListener("click", () => { this.setTickRate(this.tickRate - 1); });
		document.getElementById("tickRateMinusMinus").addEventListener("click", () => { this.setTickRate(this.tickRate - 10); });
	}

	// Controls

	setTickRate(tickRate) {
		this.tickRate = Math.max(Math.min(tickRate, 999), 1);
		const el = document.getElementById("tickRate");
		el.innerHTML = this.tickRate;
		el.title = "Step duration: " + (1.0 / this.tickRate).toFixed(3).replace(/\.?0+$/, '') + " seconds";
	}

	setGeneration(generation) {
		this.generation = generation;
		const el = document.getElementById("generation");
		el.innerHTML = this.generation;
		el.title = "Number of steps etc.";
	}

	toggleSimulation() {
		this.running = !this.running;
		const el = document.getElementById("toggle");
		if (this.running) {
			el.innerHTML = "Stop";
			this.update();
			this.timer = performance.now();
		} else {
			el.innerHTML = "Start";
		}
	}

	// Utility functions

	clearGrid() {
		for (let row = 0; row < this.rows; ++row) {
		for (let col = 0; col < this.cols; ++col) {
			this.grid[row][col] = false;
		}
		}
		this.setGeneration(0);
	}

	fillGrid() {
		for (let row = 0; row < this.rows; ++row) {
		for (let col = 0; col < this.cols; ++col) {
			this.grid[row][col] = Math.random() >= 0.5 ? true : false;
		}
		}
		this.setGeneration(0);
	}

	getCellPosition(x, y, clamp) {
		let border = this.style.border;

		let col = Math.floor((x - 0.5 * border) * this.cols / (this.canvas.width - border));
		let row = Math.floor((y - 0.5 * border) * this.rows / (this.canvas.height - border));

		if (clamp) {
			if (col < 0) col = 0;
			else if (col > this.cols - 1) col = this.cols - 1;

			if (row < 0) row = 0;
			else if (row > this.rows - 1) row = this.rows - 1;
		}

		return { col: col, row: row };
	}

	drawCell(col, row, style, strokeStyle) {
		let size = this.style.size;
		let border = this.style.border;

		let x = col * size;
		let y = row * size;


		this.ctx.fillStyle = strokeStyle;
		this.ctx.fillRect(x, y, size + border, size + border);

		this.ctx.fillStyle = style;
		this.ctx.fillRect(x + border, y + border, size - border, size - border);
	}

	strokeCell(col, row, style) {
		let size = this.style.size;
		let border = this.style.border;

		this.ctx.strokeStyle = style;
		this.ctx.lineWidth = 2 * border;
		this.ctx.strokeRect(col * size, row * size, size + border, size + border);
	}

	// Main loop

	update() {
		// Process each cell
		let changed = false;
		for (let y = 0; y < this.rows; ++y) {
			let jMin = Math.max(y - 1, 0);
			let jMax = Math.min(y + 1, this.rows - 1);
			for (let x = 0; x < this.cols; ++x) {
				let iMin = Math.max(x - 1, 0);
				let iMax = Math.min(x + 1, this.cols - 1);

				// Count living neighbors
				let neighbors = 0;
				for (let j = jMin; j <= jMax; ++j) {
					for (let i = iMin; i <= iMax; ++i) {
						if (i == x && j == y)
							continue;
						if (this.grid[j][i])
							++neighbors;
					}
				}

				// Simulate step
				let state = this.grid[y][x];
				if (state) { // Alive
					if (neighbors < 2 || neighbors > 3)
						state = false;
				} else { // Dead
					if (neighbors == 3)
						state = true;
				}
				this.gridTemp[y][x] = state;

				// Check if state changed
				if (state !== this.grid[y][x])
					changed = true;
			}
		}

		if (changed) {
			// Swap grids
			let temp = this.gridTemp;
			this.gridTemp = this.grid;
			this.grid = temp;

			// Update generation
			this.setGeneration(this.generation + 1);
		} else {
			// Stop simulation
			if (this.running)
				this.toggleSimulation();
		}
	}

	draw() {
		// Draw cells
		for (let row = 0; row < this.rows; ++row) {
		for (let col = 0; col < this.cols; ++col) {
			if (this.grid[row][col]) // Alive
				this.drawCell(col, row, this.color.alive, this.color.border);
			else // Dead
				this.drawCell(col, row, this.color.dead, this.color.border);
		}
		}

		// Draw selected cell
		if (this.selection.active)
			//this.drawCell(this.selection.col, this.selection.row, this.color.highlight, this.color.border);
			this.strokeCell(this.selection.col, this.selection.row, this.color.highlight);
	
	}

	main() {
		if (this.running) {
			let time = performance.now();
			if (time - this.timer >= 1000.0 / this.tickRate) {
				this.update();
				this.timer = time;
			}
		}	
		this.draw();

		window.requestAnimationFrame(() => { this.main(); });
	}

	// Mouse handlers

	handleMouseMove(e) {
		let { row, col } = this.getCellPosition(e.offsetX, e.offsetY, true);

		if (col !== this.selection.col || row !== this.selection.row) {
			// TODO: Edit all cells between current and last mouse position
			
			if (this.editing.active) {
				this.grid[row][col] = this.editing.value;
				this.setGeneration(0);
			}
			
			this.selection.col = col;
			this.selection.row = row;
		}
	}

	handleMouseDown(e) {
		this.editing.active = true;

		let { row, col } = this.getCellPosition(e.offsetX, e.offsetY, true);
		
		this.editing.value = !this.grid[row][col]; // Negate
		this.grid[row][col] = this.editing.value;
		this.setGeneration(0);

		this.selection.row = row;
		this.selection.col = col;
	}
	handleMouseUp(e) {
		this.editing.active = false;
	}

	handleMouseOver(e) {
		this.selection.active = true;
	}
	handleMouseOut(e) {
		this.selection.active = false;
		this.editing.active = false;
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const canvas = document.getElementById("canvas");
	const game = new Game(canvas);
});
