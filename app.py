from flask import Flask, render_template, jsonify, request
import io
import sys
import builtins
import turn_engine
import re
import chess

app = Flask(__name__)

# Global state for interactive game mode
game_board = chess.Board()
game_history = []
white_move_str = ""
black_move_str = ""

def capture_output(func, mock_inputs=None):
    """
    Executes a function and captures all of its print statements into a string.
    """
    captured_output = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured_output
    
    old_input = builtins.input
    if mock_inputs:
        input_iterator = iter(mock_inputs)
        builtins.input = lambda prompt: next(input_iterator, "0")
        
    try:
        func()
    except Exception as e:
        print(f"\nExecution ended: {e}")
    finally:
        sys.stdout = old_stdout
        builtins.input = old_input
        
    return captured_output.getvalue()

@app.route('/')
def home():
    """Renders the homepage for TurnEngine."""
    return render_template('index.html')

def extract_states(output):
    """
    Parses the console output to extract a chronological sequence of FEN states.
    """
    states = []
    lines = output.split('\n')
    
    for line in lines:
        # Look for FEN states
        match = re.search(r"Board State String: '([^']+)'", line)
        if match:
            states.append(match.group(1))
                
    # Deduplicate consecutive identical states
    clean_states = []
    for s in states:
        if not clean_states or clean_states[-1] != s:
            clean_states.append(s)
            
    return clean_states

@app.route('/interactive', methods=['POST'])
def interactive():
    """Starts a new interactive game."""
    global game_board, game_history, white_move_str, black_move_str
    game_board = chess.Board()
    game_history = []
    white_move_str = ""
    black_move_str = ""
    
    output = "Interactive Game Started. Waiting for your move...\n"
    output += f"Board State String: '{game_board.board_fen()}'"
    states = extract_states(output)
    
    return jsonify({
        "output": output, 
        "states": states,
        "legal_moves": [m.uci() for m in game_board.legal_moves]
    })

@app.route('/play_move', methods=['POST'])
def play_move():
    """Plays a move on the interactive board."""
    global game_board, game_history, white_move_str, black_move_str
    data = request.json
    move_uci = data.get('move')
    
    output_buffer = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = output_buffer
    
    try:
        move = chess.Move.from_uci(move_uci)
        if move in game_board.legal_moves:
            move_san = game_board.san(move)
            is_white_turn = game_board.turn
            
            piece = game_board.piece_at(move.from_square)
            piece_symbol = piece.unicode_symbol() if piece else ""
            piece_color = "White" if (piece and piece.color == chess.WHITE) else "Black"
            piece_name = chess.piece_name(piece.piece_type).title() if piece else "Piece"
            dest_square = chess.square_name(move.to_square).lower()
            readable_move = f"{piece_symbol} {piece_color} {piece_name} → {dest_square}"

            if is_white_turn:
                white_move_str += move_san
                print(f"HISTORY: Player 1 | {readable_move}")
            else:
                black_move_str += move_san
                print(f"HISTORY: Player 2 | {readable_move}")
                
            game_board.push(move)
            state_string = game_board.board_fen()
            print(f"[Move {len(game_history)+1}] Player played {move_uci} ({move_san})")
            print(f"Board State String: '{state_string}'")
            
            # --- Strategy Similarity Report ---
            if not is_white_turn:
                # Compare strategies after black completes a full turn cycle
                ed_dist = turn_engine.edit_distance(white_move_str, black_move_str)
                lcs_len = turn_engine.lcs(white_move_str, black_move_str)
                max_len = max(len(white_move_str), len(black_move_str))
                similarity = (lcs_len / max_len * 100) if max_len > 0 else 0
                
                print(f"White Strategy: {white_move_str}")
                print(f"Black Strategy: {black_move_str}")
                print(f"Strategy Similarity Report: Edit Distance = {ed_dist} | Similarity = {similarity:.1f}%")
                
            # LCS and Edit distance logic
            if len(game_history) > 0:
                print("  Comparing with history...")
                for idx, prev_state in enumerate(game_history):
                    lcs_length = turn_engine.lcs(state_string, prev_state)
                    max_len = max(len(state_string), len(prev_state))
                    similarity = lcs_length / max_len if max_len > 0 else 0
                    
                    ed_dist = turn_engine.edit_distance(state_string, prev_state)
                    
                    print(f"    vs Move {idx + 1} ({prev_state}): Similarity = {similarity:.2f} | Edit Distance = {ed_dist}")
                    
                    if similarity > 0.95:
                        print("    --> Potential Draw Detected (Similarity > 0.95)")
                    if ed_dist <= 1:
                        print("    --> States are nearly identical (Edit Distance <= 1)")
                        
            game_history.append(state_string)
            
            if game_board.can_claim_threefold_repetition():
                print("    *** Draw by Threefold Repetition! ***")
                legal_moves_list = []
            elif game_board.is_game_over():
                print("Game Over!")
                legal_moves_list = []
            else:
                legal_moves_list = [m.uci() for m in game_board.legal_moves]
        else:
            print(f"Invalid move: {move_uci}")
            legal_moves_list = [m.uci() for m in game_board.legal_moves]
    except Exception as e:
        print(f"Error: {e}")
        legal_moves_list = [m.uci() for m in game_board.legal_moves]
    finally:
        sys.stdout = old_stdout
        
    output = output_buffer.getvalue()
    states = extract_states(output)
    return jsonify({
        "output": output,
        "states": states,
        "legal_moves": legal_moves_list
    })

@app.route('/race-demo', methods=['POST'])
def race_demo():
    output = capture_output(turn_engine.simulate_race_condition)
    states = extract_states(output)
    return jsonify({"output": output, "states": states})

@app.route('/semaphore-demo', methods=['POST'])
def semaphore_demo():
    output = capture_output(turn_engine.simulate_semaphore_sync)
    states = extract_states(output)
    return jsonify({"output": output, "states": states})

@app.route('/simulation', methods=['POST'])
def simulation():
    output = capture_output(turn_engine.simulate_20_moves)
    states = extract_states(output)
    return jsonify({"output": output, "states": states})

if __name__ == "__main__":
    app.run(debug=True)
