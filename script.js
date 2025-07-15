window.onload = () => {
    let canvas, ctx;
    let size, cellSize;
    let board = [], player = 'B', specialMode = false, specialPlayer = '';
    let gameOver = false, chainCount = 0;
    let blackRevengeLeft = 0, whiteRevengeLeft = 0;
    let difficulty = 'easy';
    let aiEnabled = true;
    let passCount = 0;

    // BGM
    const musicList = [
        new Audio("bgm.mp3"),
        new Audio("待機.mp3"),
        new Audio("敗走.m4a")
    ];
    let currentMusic = null;
    let musicEnabled = true;
    let bgmVolume = 0.5;

    // SE
    const seStart = new Audio("スタート.mp3");
    const sePlace = new Audio("石をおく.mp3");
    const seRevenge = new Audio("リベンジ.mp3");
    const seRevengeFlip = new Audio("リベンジ時.mp3");
    const seCancel = new Audio("キャンセル1.mp3");
    const seEnd = new Audio("終了.mp3");
    const seList = [seStart, sePlace, seRevenge, seRevengeFlip, seCancel, seEnd];
    let seVolume = 0.5;

    setVolumes();

    function setVolumes() {
        if (currentMusic) currentMusic.volume = bgmVolume;
        musicList.forEach(m => m.volume = bgmVolume);
        seList.forEach(s => s.volume = seVolume);
    }

    // UI
    const revengeBtn = document.getElementById("revengeBtn");
    const scoreDiv = document.getElementById("score");
    const messageDiv = document.getElementById("message");
    const specialCountDiv = document.getElementById("specialCount");
    const musicBtn = document.getElementById("musicToggle");
    const bgmSlider = document.getElementById("bgmVolume");
    const seSlider = document.getElementById("seVolume");

    document.getElementById("startBtn").addEventListener("click", startGame);
    revengeBtn.addEventListener("click", () => {
        if (specialMode && specialPlayer === 'B') {
            seCancel.play();
            endRevenge();
        }
    });

    musicBtn.addEventListener("click", () => {
        musicEnabled = !musicEnabled;
        musicBtn.innerText = musicEnabled ? "BGM: ON" : "BGM: OFF";
        if (musicEnabled) {
            if (currentMusic) currentMusic.play();
        } else {
            if (currentMusic) currentMusic.pause();
        }
    });

    bgmSlider.addEventListener("input", () => {
        bgmVolume = parseFloat(bgmSlider.value);
        setVolumes();
    });

    seSlider.addEventListener("input", () => {
        seVolume = parseFloat(seSlider.value);
        setVolumes();
    });

    function startRandomMusic() {
        if (!musicEnabled) return;
        if (currentMusic) {
            currentMusic.pause();
            currentMusic.currentTime = 0;
        }
        currentMusic = musicList[Math.floor(Math.random() * musicList.length)];
        currentMusic.loop = true;
        currentMusic.volume = bgmVolume;
        currentMusic.play();
    }

    function startGame() {
        seStart.play();
        startRandomMusic();

        size = parseInt(document.getElementById("boardSize").value);
        blackRevengeLeft = whiteRevengeLeft = parseInt(document.getElementById("revengeLimit").value);
        difficulty = document.getElementById("difficulty").value;

        document.getElementById("boardSize").disabled = true;
        document.getElementById("revengeLimit").disabled = true;
        document.getElementById("difficulty").disabled = true;
        document.getElementById("startBtn").disabled = true;

        canvas = document.getElementById("board");
        ctx = canvas.getContext("2d");
        canvas.style.display = "block";

        canvas.width = 400;
        canvas.height = 400;
        cellSize = 400 / size;

        initBoard();
        updateDisplay();

        canvas.onclick = e => {
            if (gameOver) return;
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / cellSize);
            const y = Math.floor((e.clientY - rect.top) / cellSize);

            if (x < 0 || x >= size || y < 0 || y >= size) return;

            if (specialMode) {
                if (specialPlayer === 'B' && board[y][x] === 'W') triggerRevenge(x, y, 'B');
                else if (specialPlayer === 'W' && board[y][x] === 'B') triggerRevenge(x, y, 'W');
                return;
            }

            if (player !== 'B') return;

            let flips = getFlips(x, y, player);
            if (flips === 0) return;

            applyMove(x, y, player);
            sePlace.play();
            updateDisplay();

            if (flips >= 2 && whiteRevengeLeft > 0) {
                startRevenge('W');
            } else {
                nextTurn();
            }
        };
    }

    function initBoard() {
        board = Array.from({ length: size }, () => Array(size).fill('.'));
        const mid = Math.floor(size / 2);
        board[mid - 1][mid - 1] = board[mid][mid] = 'W';
        board[mid - 1][mid] = board[mid][mid - 1] = 'B';
        player = 'B';
        gameOver = false;
        specialMode = false;
        specialPlayer = '';
        chainCount = 0;
        passCount = 0;
        revengeBtn.style.display = 'none';
        document.body.className = "";
        messageDiv.innerText = "";
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                ctx.fillStyle = "#388e3c";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                if (!specialMode) {
                    let flips = getFlips(x, y, player);
                    if (flips > 0) {
                        ctx.fillStyle = flips >= 5 ? "#90d490" : flips >= 3 ? "#c6e6c6" : "#e8f8e8";
                        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                    }
                }

                ctx.strokeStyle = "black";
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

                if (board[y][x] !== '.') {
                    ctx.beginPath();
                    ctx.arc(x * cellSize + cellSize/2, y * cellSize + cellSize/2, cellSize/2 - 4, 0, Math.PI*2);
                    ctx.fillStyle = board[y][x] === 'B' ? "black" : "white";
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }
    }

    function startRevenge(who) {
        seRevenge.play();
        specialMode = true;
        specialPlayer = who;
        chainCount++;
        let lvl = chainCount >= 3 ? 3 : chainCount;
        document.body.className = `revenge-level-${lvl}-${who==='B'?'black':'white'}`;
        messageDiv.innerText = who==='B' ? "REVENGE! Click to flip or QUIT." : "REVENGE! White is thinking...";
        updateSpecialCount();
        updateDisplay();

        if (who === 'W') {
            setTimeout(() => {
                let totalCells = size * size;
                let wCount = board.flat().filter(c => c === 'W').length;
                let wRatio = wCount / totalCells;

                // AI石が少ないほどリベンジ率UP
                let probability = 1.0 - wRatio;
                probability = Math.min(1, Math.max(0.2, probability)); // 最小20%、最大100%

                if (Math.random() < probability) {
                    aiRevenge();
                } else {
                    endRevenge();
                }
            }, 800);
        } else {
            revengeBtn.style.display = 'inline';
        }
    }

    function triggerRevenge(x, y, color) {
        seRevengeFlip.play();
        if (color === 'B') blackRevengeLeft--;
        else whiteRevengeLeft--;

        board[y][x] = color;
        let flips = getFlips(x, y, color);
        applyMove(x, y, color);
        updateDisplay();
        if (flips >= 2 && (color === 'B' ? whiteRevengeLeft : blackRevengeLeft) > 0) {
            startRevenge(color === 'B' ? 'W' : 'B');
        } else endRevenge();
    }

    function endRevenge() {
        specialMode = false;
        specialPlayer = '';
        chainCount = 0;
        document.body.className = "";
        messageDiv.innerText = "";
        revengeBtn.style.display = 'none';
        updateDisplay();
        nextTurn();
    }

    function nextTurn() {
        player = player === 'B' ? 'W' : 'B';
        if (!hasValidMove(player)) {
            messageDiv.innerText = `${player==='B'?'Black':'White'} has no moves. Passing...`;
            passCount++;
            player = player === 'B' ? 'W' : 'B';
            if (!hasValidMove(player)) {
                messageDiv.innerText = "No moves for both. Ending game.";
                seEnd.play();
                showResult();
                return;
            }
        } else {
            passCount = 0;
        }
        updateDisplay();
        if (player === 'W' && aiEnabled) setTimeout(aiMove, 300);
    }

    function hasValidMove(p) {
        return board.some((row, y) => row.some((_, x) => getFlips(x, y, p) > 0));
    }

    function getFlips(x, y, p) {
        if (board[y][x] !== '.') return 0;
        let opp = p === 'B' ? 'W' : 'B';
        let count = 0;
        for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) {
            if (dx===0 && dy===0) continue;
            let nx=x+dx, ny=y+dy, line=0;
            while (nx>=0 && nx<size && ny>=0 && ny<size && board[ny][nx]===opp) {
                nx+=dx; ny+=dy; line++;
            }
            if (line>0 && nx>=0 && nx<size && ny>=0 && ny<size && board[ny][nx]===p) count+=line;
        }
        return count;
    }
    function applyMove(x, y, p) {
        board[y][x] = p;
        let opp = p === 'B' ? 'W' : 'B';
        for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) {
            if (dx===0 && dy===0) continue;
            let nx=x+dx, ny=y+dy, toFlip=[];
            while (nx>=0 && nx<size && ny>=0 && ny<size && board[ny][nx]===opp) {
                toFlip.push([nx,ny]); nx+=dx; ny+=dy;
            }
            if (toFlip.length>0 && nx>=0 && nx<size && ny>=0 && ny<size && board[ny][nx]===p)
                toFlip.forEach(([fx,fy])=>board[fy][fx]=p);
        }
    }

    function applyMoveTemp(x, y, p, tempBoard) {
        tempBoard[y][x] = p;
        let opp = p === 'B' ? 'W' : 'B';
        for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) {
            if (dx===0 && dy===0) continue;
            let nx=x+dx, ny=y+dy, toFlip=[];
            while (nx>=0 && nx<size && ny>=0 && ny<size && tempBoard[ny][nx]===opp) {
                toFlip.push([nx,ny]); nx+=dx; ny+=dy;
            }
            if (toFlip.length>0 && nx>=0 && nx<size && ny>=0 && ny<size && tempBoard[ny][nx]===p)
                toFlip.forEach(([fx,fy])=>tempBoard[fy][fx]=p);
        }
    }

    function updateDisplay() {
        drawBoard();
        let b = board.flat().filter(c=>c==='B').length;
        let w = board.flat().filter(c=>c==='W').length;
        scoreDiv.innerText = `Black: ${b}   White: ${w}`;
        updateSpecialCount();
    }

    function updateSpecialCount() {
        specialCountDiv.innerText = `Black Revenges Left: ${blackRevengeLeft} | White: ${whiteRevengeLeft}`;
    }

    function showResult() {
        let b = board.flat().filter(c=>c==='B').length;
        let w = board.flat().filter(c=>c==='W').length;
        gameOver = true;
        messageDiv.innerText = b > w ? "Black wins!" : w > b ? "White wins!" : "Draw!";
    }

    function aiMove() {
        if (difficulty === 'easy') randomAI();
        else if (difficulty === 'hard') greedyAI();
        else monteCarloAI();
    }

    function randomAI() {
        let moves = [];
        for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
            if (getFlips(x, y, 'W')>0) moves.push([x,y]);
        }
        if (moves.length===0) { nextTurn(); return; }
        let [mx,my] = moves[Math.floor(Math.random()*moves.length)];
        let flips = getFlips(mx, my, 'W');
        applyMove(mx, my, 'W');
        sePlace.play();
        updateDisplay();
        if (flips >=2 && blackRevengeLeft > 0) startRevenge('B');
        else nextTurn();
    }

    function greedyAI() {
        let best=null, bestCount=0;
        for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
            let flips = getFlips(x,y,'W');
            if (flips>bestCount) { best=[x,y]; bestCount=flips; }
        }
        if (!best) { nextTurn(); return; }
        let [mx,my] = best;
        let flips = getFlips(mx, my, 'W');
        applyMove(mx, my, 'W');
        sePlace.play();
        updateDisplay();
        if (flips >=2 && blackRevengeLeft > 0) startRevenge('B');
        else nextTurn();
    }

    function monteCarloAI() {
        let moves = [];
        for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
            if (getFlips(x,y,'W')>0) moves.push([x,y]);
        }
        if (moves.length===0) { nextTurn(); return; }

        let bestMove=moves[0], bestScore=-1;
        for (let [mx,my] of moves) {
            let wins=0;
            for (let i=0; i<5; i++) {
                let temp=JSON.parse(JSON.stringify(board));
                applyMoveTemp(mx, my, 'W', temp);
                let winner=simulatePlayout(['B'], temp);
                if (winner==='W') wins++;
            }
            let score=wins/5;
            if (score>bestScore) { bestScore=score; bestMove=[mx,my]; }
        }
        let [mx,my] = bestMove;
        let flips = getFlips(mx, my, 'W');
        applyMove(mx, my, 'W');
        sePlace.play();
        updateDisplay();
        if (flips >=2 && blackRevengeLeft > 0) startRevenge('B');
        else nextTurn();
    }

    function getFlipsTemp(x, y, p, tempBoard) {
        if (tempBoard[y][x] !== '.') return 0;
        let opp = p === 'B' ? 'W' : 'B';
        let count = 0;
        for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) {
            if (dx===0 && dy===0) continue;
            let nx=x+dx, ny=y+dy, line=0;
            while (nx>=0 && nx<size && ny>=0 && ny<size && tempBoard[ny][nx]===opp) {
                nx+=dx; ny+=dy; line++;
            }
            if (line>0 && nx>=0 && nx<size && ny>=0 && ny<size && tempBoard[ny][nx]===p) count+=line;
        }
        return count;
    }

    function simulatePlayout(turns, tempBoard) {
        let p=turns[0];
        for (let i=0; i<50; i++) {
            let moves=[];
            for (let y=0; y<size; y++) for (let x=0; x<size; x++)
                if (getFlipsTemp(x,y,p,tempBoard)>0) moves.push([x,y]);
            if (moves.length===0) {
                p=p==='B'?'W':'B';
                continue;
            }
            let [mx,my]=moves[Math.floor(Math.random()*moves.length)];
            applyMoveTemp(mx,my,p,tempBoard);
            p=p==='B'?'W':'B';
        }
        let b=tempBoard.flat().filter(c=>c==='B').length;
        let w=tempBoard.flat().filter(c=>c==='W').length;
        return b>w?'B':w>b?'W':'D';
    }

    function aiRevenge() {
        let moves=[];
        for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
            if (board[y][x]==='B') moves.push([x,y]);
        }
        if (moves.length===0) { endRevenge(); return; }
        let [rx, ry] = moves[Math.floor(Math.random() * moves.length)];
        triggerRevenge(rx, ry, 'W');
    }
};
