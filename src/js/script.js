class Game {
	constructor(canvas) {
		window.game = this; // Console access

		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		// Parameters

		this.cols = 64;
		this.rows = 48;
		
		this.grid = null;
		this.gridTemp = null;

		this.running = false;

		this.tickRate = 2;
		this.timer = performance.now();

		this.selection = { active: false,col: -1, row: -1};
		this.editing = { active: false, value: null };

		this.style = { border: 1, size: 12 };

		// Functions

		this.init();

		window.requestAnimationFrame(() => { this.main(); }); // Start game
	}

	// Init

	init() {
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
		let toggle = document.getElementById("toggle");
		toggle.addEventListener("click", () => {
			this.running = !this.running;

			if (this.running) {
				toggle.innerHTML = "Stop";
				this.update();
				this.timer = performance.now();
			} else {
				toggle.innerHTML = "Start";
			}
		});
		document.getElementById("step").addEventListener("click", () => { this.update(); });
		document.getElementById("clear").addEventListener("click", () => { this.clearGrid(); });
		document.getElementById("fill").addEventListener("click", () => { this.fillGrid(); });
	}

	// Utility functions

	clearGrid() {
		for (let row = 0; row < this.rows; ++row) {
		for (let col = 0; col < this.cols; ++col) {
			this.grid[row][col] = false;
		}
		}
	}

	fillGrid() {
		for (let row = 0; row < this.rows; ++row) {
		for (let col = 0; col < this.cols; ++col) {
			this.grid[row][col] = Math.random() >= 0.5 ? true : false;
		}
		}
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
			}
		}

		// Swap grids
		let temp = this.gridTemp;
		this.gridTemp = this.grid;
		this.grid = temp;
	}

	draw() {
		const alive = "rgb(64, 64, 64)";
		const dead  = "rgb(247, 247, 247)";
		const border = "rgb(196, 196, 196)";
		const highlight = "rgb(223, 64, 16)";

		let w = this.canvas.width / this.cols;
		let h = this.canvas.height / this.rows;

		for (let row = 0; row < this.rows; ++row) {
			let y = row / this.rows * this.canvas.height;
			for (let col = 0; col < this.cols; ++col) {
				let x = col / this.cols * this.canvas.width;

				if (this.grid[row][col])
					this.ctx.fillStyle = alive;
				else
					this.ctx.fillStyle = dead;

				//this.ctx.fillRect(x, y, w, h);
				this.drawCell(col, row, this.ctx.fillStyle, border);
			}
		}

		if (this.selection.active)
			//this.drawCell(this.selection.col, this.selection.row, highlight, border);
			this.strokeCell(this.selection.col, this.selection.row, highlight);
	
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
			
			if (this.editing.active)
				this.grid[row][col] = this.editing.value;
			
			this.selection.col = col;
			this.selection.row = row;
		}
	}

	handleMouseDown(e) {
		this.editing.active = true;

		let { row, col } = this.getCellPosition(e.offsetX, e.offsetY, true);
		
		this.editing.value = !this.grid[row][col]; // Negate
		this.grid[row][col] = this.editing.value;

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
