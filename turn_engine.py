# turn_engine.py
import threading
import time
import random
import chess

def lcs(a, b):
    """
    Calculates the length of the Longest Common Subsequence (LCS) between two strings 
    using Dynamic Programming (DP).
    """
    dp_table = [[0 for _ in range(len(b) + 1)] for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp_table[i][j] = dp_table[i - 1][j - 1] + 1
            else:
                dp_table[i][j] = max(dp_table[i - 1][j], dp_table[i][j - 1])
    return dp_table[len(a)][len(b)]

def edit_distance(a, b):
    """
    Calculates the Levenshtein Edit Distance between two strings using Dynamic Programming.
    """
    dp_table = [[0 for _ in range(len(b) + 1)] for _ in range(len(a) + 1)]
    for i in range(len(a) + 1): dp_table[i][0] = i
    for j in range(len(b) + 1): dp_table[0][j] = j
        
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp_table[i][j] = dp_table[i - 1][j - 1]
            else:
                dp_table[i][j] = 1 + min(dp_table[i - 1][j], 
                                         dp_table[i][j - 1], 
                                         dp_table[i - 1][j - 1])
    return dp_table[len(a)][len(b)]

def simulate_race_condition():
    """
    Demonstrates a race condition by having two threads attempt to read and move
    the same chess piece simultaneously without synchronization (locks).
    """
    print("\n--- Starting Multithreading Race Condition Demo ---")
    
    # Create an empty board and place a single White Knight in the center
    shared_board = chess.Board(None) 
    shared_board.set_piece_at(chess.E4, chess.Piece(chess.KNIGHT, chess.WHITE))
    print(f"Board State String: '{shared_board.board_fen()}'")
    
    def player_thread_task(thread_name, dest_square):
        print(f"Thread [{thread_name}] starting. Goal: move Knight to {chess.square_name(dest_square).upper()}")
        
        # 1. READ PHASE (Critical Section Start)
        # Find the Knight's current position
        knights = list(shared_board.pieces(chess.KNIGHT, chess.WHITE))
        if not knights:
            print(f"Thread [{thread_name}] ERROR: Knight vanished!")
            return
            
        current_square = knights[0]
        print(f"Thread [{thread_name}] read Knight at {chess.square_name(current_square).upper()}")
        
        # 2. CONTEXT SWITCH (Delay)
        # By sleeping here, we guarantee both threads will read the Knight at E4
        # before either thread has a chance to move it.
        time.sleep(0.5) 
        
        # 3. WRITE PHASE (Critical Section End)
        # Remove it from where we *thought* it was, and place it at the destination
        shared_board.remove_piece_at(current_square)
        shared_board.set_piece_at(dest_square, chess.Piece(chess.KNIGHT, chess.WHITE))
        
        print(f"RACE CONDITION ALERT: Thread [{thread_name}] overwrote board! Placed Knight at {chess.square_name(dest_square).upper()}")
        print(f"Board State String: '{shared_board.board_fen()}'")

    # Thread 1 wants to move the Knight UP
    thread_1 = threading.Thread(target=player_thread_task, args=("UP", chess.E8))
    # Thread 2 wants to move the Knight RIGHT
    thread_2 = threading.Thread(target=player_thread_task, args=("RIGHT", chess.H4))
    
    # Start both threads simultaneously
    thread_1.start()
    thread_2.start()
    
    # Wait for completion
    thread_1.join()
    thread_2.join()
    
    print("\nRace Condition Demo Complete!")
    print("Notice how the Knight was DUPLICATED! Both threads read E4 simultaneously, leading to corrupted state.")
    print(f"Final Board State String: '{shared_board.board_fen()}'")

def simulate_semaphore_sync():
    """
    Demonstrates how to fix a race condition using a Semaphore for Mutual Exclusion.
    The semaphore ensures that only one thread can access the 'critical section'
    (the board updating logic) at any given time.
    """
    print("\n--- Starting Semaphore Synchronized Demo ---")
    
    # Create an empty board and place a single White Knight in the center
    shared_board = chess.Board(None) 
    shared_board.set_piece_at(chess.E4, chess.Piece(chess.KNIGHT, chess.WHITE))
    print(f"Initial Board State String: '{shared_board.board_fen()}'")
    
    # Create a semaphore with a value of 1 (also known as a mutex).
    board_semaphore = threading.Semaphore(1)
    
    def player_thread_task(thread_name, file_offset, rank_offset):
        print(f"Thread [{thread_name}] is waiting for the Semaphore...")
        
        # Acquire the semaphore before entering the Critical Section.
        # If another thread has it, this thread will wait here until it's released.
        board_semaphore.acquire()
        print(f"Semaphore Acquired by [{thread_name}]")
        
        try:
            # --- CRITICAL SECTION START ---
            knights = list(shared_board.pieces(chess.KNIGHT, chess.WHITE))
            if not knights:
                print(f"Thread [{thread_name}] ERROR: Knight vanished!")
                return
                
            current_square = knights[0]
            print(f"Thread [{thread_name}] read Knight at {chess.square_name(current_square).upper()}")
            
            # The delay is inside the critical section. 
            # Because of the semaphore, the other thread is forced to wait outside, preventing overlap.
            time.sleep(0.5) 
            
            new_file = min(7, max(0, chess.square_file(current_square) + file_offset))
            new_rank = min(7, max(0, chess.square_rank(current_square) + rank_offset))
            dest_square = chess.square(new_file, new_rank)
            
            shared_board.remove_piece_at(current_square)
            shared_board.set_piece_at(dest_square, chess.Piece(chess.KNIGHT, chess.WHITE))
            
            print(f"Thread [{thread_name}] safely moved Knight to {chess.square_name(dest_square).upper()}")
            print(f"Board State String: '{shared_board.board_fen()}'")
            # --- CRITICAL SECTION END ---
        except Exception as e:
            print(f"Error for [{thread_name}]: {e}")
        finally:
            print(f"Semaphore Released by [{thread_name}]")
            board_semaphore.release()

    # Thread 1 wants to move the Knight UP by 4 ranks
    thread_1 = threading.Thread(target=player_thread_task, args=("UP", 0, 4))
    # Thread 2 wants to move the Knight RIGHT by 3 files
    thread_2 = threading.Thread(target=player_thread_task, args=("RIGHT", 3, 0))
    
    # Start both threads simultaneously
    thread_1.start()
    thread_2.start()
    
    # Wait for completion
    thread_1.join()
    thread_2.join()
    
    print("\nSemaphore Sync Demo Complete!")
    print("Notice how the Knight moved safely in sequence (E4 -> E8 -> H8) without duplication!")
    print(f"Final Board State String: '{shared_board.board_fen()}'")


def simulate_20_moves():
    """
    Simulates 20 alternating valid chess moves automatically.
    Demonstrates history tracking, LCS, Edit Distance, and semaphores over a longer sequence.
    """
    print("\n--- Starting 20-Move Simulation Mode ---")
    board = chess.Board()
    history = []
    state_counts = {}
    
    board_semaphore = threading.Semaphore(1)
    
    def auto_move(move_number):
        board_semaphore.acquire()
        try:
            if board.is_game_over():
                return
                
            legal_moves = list(board.legal_moves)
            if not legal_moves:
                return
                
            move = random.choice(legal_moves)
            player = "White" if board.turn == chess.WHITE else "Black"
            
            board.push(move)
            state_string = board.board_fen()
            history.append(state_string)
            
            if state_string in state_counts:
                state_counts[state_string] += 1
            else:
                state_counts[state_string] = 1
            
            print(f"\n[Move {move_number}] Player {player} played {move.uci()}")
            print(f"Board State String: '{state_string}'")
            print(f"Repetition Count for this state: {state_counts[state_string]}")
            
            if state_counts[state_string] >= 3 or board.can_claim_threefold_repetition():
                print("    *** Draw by Threefold Repetition! ***")
            
            if len(history) > 1:
                print("  Comparing with history...")
                for idx in range(len(history) - 1):
                    prev_state = history[idx]
                    
                    lcs_len = lcs(state_string, prev_state)
                    similarity = lcs_len / max(len(state_string), len(prev_state))
                    ed_dist = edit_distance(state_string, prev_state)
                    
                    print(f"    vs Move {idx + 1} ({prev_state}): Similarity = {similarity:.2f} | Edit Distance = {ed_dist}")
                    
                    if similarity > 0.95:
                        print("    --> Potential Draw Detected (Similarity > 0.95)")
                    if ed_dist <= 1:
                        print("    --> States are nearly identical (Edit Distance <= 1)")
        finally:
            board_semaphore.release()

    for i in range(1, 21):
        if board.is_game_over():
            break
        t = threading.Thread(target=auto_move, args=(i,))
        t.start()
        t.join()
        
    print("\n20-Move Simulation Complete!")
    print("Final Board State String: '{}'".format(board.board_fen()))

def main():
    print("TurnEngine backend library loaded.")

if __name__ == "__main__":
    main()
