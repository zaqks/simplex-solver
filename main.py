import numpy as np
from fractions import Fraction

class SimplexAlgorithm:
    def __init__(self):
        self.tableau = None
        self.vdb = []  # Variables dans la base
        self.vhb = []  # Variables hors base
        self.n_decision = 0  # Number of decision variables
        self.n_slack = 0  # Number of slack variables
        self.iteration = 0
        
    def input_problem(self):
        """Input the non-standardized linear program"""
        print("="*70)
        print("ALGORITHME DU SIMPLEXE - SAISIE DU PROBLÈME")
        print("="*70)
        
        # Number of decision variables
        self.n_decision = int(input("\nNombre de variables de décision (x1, x2, ...): "))
        
        # Objective function coefficients
        print(f"\nFonction objectif Z = c1*x1 + c2*x2 + ... + c{self.n_decision}*x{self.n_decision}")
        obj_coeffs = []
        for i in range(self.n_decision):
            c = float(input(f"  Coefficient c{i+1}: "))
            obj_coeffs.append(c)
        
        # Number of constraints
        self.n_slack = int(input(f"\nNombre de contraintes (≤): "))
        
        # Constraint coefficients and RHS
        print(f"\nPour chaque contrainte de la forme: a1*x1 + a2*x2 + ... ≤ b")
        constraints = []
        rhs = []
        for i in range(self.n_slack):
            print(f"\n  Contrainte {i+1}:")
            constraint = []
            for j in range(self.n_decision):
                a = float(input(f"    Coefficient a{j+1}: "))
                constraint.append(a)
            b = float(input(f"    Membre de droite b: "))
            constraints.append(constraint)
            rhs.append(b)
        
        return obj_coeffs, constraints, rhs
    
    def standardize(self, obj_coeffs, constraints, rhs):
        """Convert to standard form by adding slack variables"""
        print("\n" + "="*70)
        print("FORME STANDARD DU PROGRAMME")
        print("="*70)
        
        print("\nVariables d'écart introduites:")
        for i in range(self.n_slack):
            print(f"  x{self.n_decision + i + 1} ≥ 0  (variable d'écart pour contrainte {i+1})")
        
        print("\nSystème standardisé:")
        for i in range(self.n_slack):
            eq = ""
            for j in range(self.n_decision):
                if constraints[i][j] != 0:
                    if eq and constraints[i][j] > 0:
                        eq += " + "
                    elif constraints[i][j] < 0:
                        eq += " - "
                    if abs(constraints[i][j]) != 1:
                        eq += f"{abs(constraints[i][j])}*"
                    eq += f"x{j+1}"
            eq += f" + x{self.n_decision + i + 1} = {rhs[i]}"
            print(f"  {eq}")
        
        obj_str = "Z = "
        for i in range(self.n_decision):
            if obj_coeffs[i] != 0:
                if i > 0 and obj_coeffs[i] > 0:
                    obj_str += " + "
                elif obj_coeffs[i] < 0:
                    obj_str += " - "
                if abs(obj_coeffs[i]) != 1:
                    obj_str += f"{abs(obj_coeffs[i])}*"
                obj_str += f"x{i+1}"
        obj_str += "  à maximiser"
        print(f"\n  {obj_str}")
        
    def create_initial_tableau(self, obj_coeffs, constraints, rhs):
        """Create the initial simplex tableau"""
        n_rows = self.n_slack + 1  # constraints + Z row
        n_cols = self.n_decision + self.n_slack + 1  # decision + slack + constant
        
        self.tableau = np.zeros((n_rows, n_cols))
        
        # Fill constraint rows
        for i in range(self.n_slack):
            for j in range(self.n_decision):
                self.tableau[i, j] = constraints[i][j]
            self.tableau[i, self.n_decision + i] = 1  # slack variable
            self.tableau[i, -1] = rhs[i]  # RHS
        
        # Fill Z row (objective function)
        for j in range(self.n_decision):
            self.tableau[-1, j] = obj_coeffs[j]
        
        # Initialize base variables
        self.vdb = [f"x{self.n_decision + i + 1}" for i in range(self.n_slack)]
        self.vhb = [f"x{i+1}" for i in range(self.n_decision)]
        
    def display_tableau(self, title="TABLEAU"):
        """Display the current simplex tableau"""
        print("\n" + "="*70)
        print(title)
        print("="*70)
        
        # Header
        header = "VDB \\ VHB |"
        for var in self.vhb:
            header += f" {var:>8} |"
        for i, var in enumerate(self.vdb):
            header += f" {var:>8} |"
        header += "   cste   |"
        print(header)
        print("-" * len(header))
        
        # Constraint rows
        for i, var in enumerate(self.vdb):
            row = f"   {var:>4}    |"
            for j in range(len(self.vhb)):
                row += f" {self.tableau[i, j]:>8.2f} |"
            for j in range(len(self.vdb)):
                if j == i:
                    row += f" {1:>8.2f} |"
                else:
                    row += f" {0:>8.2f} |"
            row += f" {self.tableau[i, -1]:>8.2f} |"
            print(row)
        
        # Z row
        row = "     Z     |"
        for j in range(len(self.vhb)):
            row += f" {self.tableau[-1, j]:>8.2f} |"
        for j in range(len(self.vdb)):
            row += f" {0:>8.2f} |"
        row += f" {self.tableau[-1, -1]:>8.2f} |"
        print(row)
        print("=" * len(header))
        
    def select_entering_variable(self):
        """Select entering variable (most positive coefficient in Z row)"""
        max_val = -float('inf')
        entering_col = -1
        
        for j in range(len(self.vhb)):
            if self.tableau[-1, j] > max_val:
                max_val = self.tableau[-1, j]
                entering_col = j
        
        if max_val <= 0:
            return None, None
        
        return entering_col, self.vhb[entering_col]
    
    def select_leaving_variable(self, entering_col):
        """Select leaving variable (minimum ratio test)"""
        min_ratio = float('inf')
        leaving_row = -1
        
        print("\nCalcul de la colonne C (test du ratio minimum):")
        print(f"{'Variable':>10} | {'Coeff':>8} | {'Constante':>10} | {'Ratio C':>10}")
        print("-" * 50)
        
        for i in range(self.n_slack):
            coeff = self.tableau[i, entering_col]
            const = self.tableau[i, -1]
            
            if coeff > 0:
                ratio = const / coeff
                print(f"{self.vdb[i]:>10} | {coeff:>8.2f} | {const:>10.2f} | {ratio:>10.2f}")
                if ratio < min_ratio:
                    min_ratio = ratio
                    leaving_row = i
            else:
                print(f"{self.vdb[i]:>10} | {coeff:>8.2f} | {const:>10.2f} | {'   +∞':>10}")
        
        if leaving_row == -1:
            return None, None
        
        return leaving_row, self.vdb[leaving_row]
    
    def pivot_operation(self, entering_col, leaving_row):
        """Perform pivot operation to update tableau"""
        pivot = self.tableau[leaving_row, entering_col]
        
        # Divide pivot row by pivot element
        self.tableau[leaving_row, :] /= pivot
        
        # Eliminate entering variable from other rows
        for i in range(self.n_slack + 1):
            if i != leaving_row:
                factor = self.tableau[i, entering_col]
                self.tableau[i, :] -= factor * self.tableau[leaving_row, :]
        
    def perform_iteration(self):
        """Perform one iteration of the simplex algorithm"""
        self.iteration += 1
        print(f"\n{'#'*70}")
        print(f"ITÉRATION {self.iteration}")
        print(f"{'#'*70}")
        
        # Display current tableau
        self.display_tableau(f"TABLEAU {self.iteration - 1}")
        
        # Select entering variable
        entering_col, entering_var = self.select_entering_variable()
        
        if entering_col is None:
            print("\n✓ CRITÈRE D'ARRÊT: Tous les coefficients de Z sont ≤ 0")
            print("✓ SOLUTION OPTIMALE ATTEINTE!")
            return False
        
        print(f"\n→ Variable entrante: {entering_var} (coefficient {self.tableau[-1, entering_col]:.2f})")
        
        # Select leaving variable
        leaving_row, leaving_var = self.select_leaving_variable(entering_col)
        
        if leaving_row is None:
            print("\n✗ PROBLÈME NON BORNÉ!")
            return False
        
        print(f"\n→ Variable sortante: {leaving_var} (ratio minimum = {self.tableau[leaving_row, -1] / self.tableau[leaving_row, entering_col]:.2f})")
        print(f"→ Pivot = {self.tableau[leaving_row, entering_col]:.2f}")
        print(f"\n{entering_var} ↔ {leaving_var} (permutation)")
        
        # Update base variables
        self.vdb[leaving_row], self.vhb[entering_col] = self.vhb[entering_col], self.vdb[leaving_row]
        
        # Perform pivot
        self.pivot_operation(entering_col, leaving_row)
        
        return True
    
    def display_solution(self):
        """Display the final optimal solution"""
        print("\n" + "="*70)
        print("SOLUTION OPTIMALE")
        print("="*70)
        
        # Display tableau one more time
        self.display_tableau(f"TABLEAU FINAL (Itération {self.iteration})")
        
        # Extract solution
        solution = {}
        for i in range(1, self.n_decision + self.n_slack + 1):
            var = f"x{i}"
            if var in self.vdb:
                idx = self.vdb.index(var)
                solution[var] = self.tableau[idx, -1]
            else:
                solution[var] = 0
        
        z_value = -self.tableau[-1, -1]
        
        print("\nValeurs des variables:")
        # Decision variables
        for i in range(1, self.n_decision + 1):
            var = f"x{i}"
            print(f"  {var} = {solution[var]:.2f}")
        
        # Slack variables
        print("\nVariables d'écart:")
        for i in range(self.n_decision + 1, self.n_decision + self.n_slack + 1):
            var = f"x{i}"
            val = solution[var]
            print(f"  {var} = {val:.2f}", end="")
            if val == 0:
                print(f"  (contrainte {i - self.n_decision} saturée)")
            else:
                print(f"  (contrainte {i - self.n_decision} non saturée)")
        
        print(f"\nValeur optimale de Z:")
        print(f"  Z_max = {z_value:.2f}")
        
        # Display Z function in terms of VHB
        z_func = "Z = "
        first = True
        for j, var in enumerate(self.vhb):
            coeff = self.tableau[-1, j]
            if abs(coeff) > 1e-10:
                if not first and coeff > 0:
                    z_func += " + "
                elif coeff < 0:
                    z_func += " - "
                if abs(coeff) != 1:
                    z_func += f"{abs(coeff):.2f}*"
                z_func += var
                first = False
        if abs(z_value) > 1e-10:
            z_func += f" + {z_value:.2f}"
        print(f"\nFonction objectif finale:")
        print(f"  {z_func}")
        
    def solve(self):
        """Main method to solve the linear program"""
        # Input problem
        obj_coeffs, constraints, rhs = self.input_problem()
        
        # Standardize
        self.standardize(obj_coeffs, constraints, rhs)
        
        # Create initial tableau
        self.create_initial_tableau(obj_coeffs, constraints, rhs)
        
        # Initial solution
        print("\n" + "="*70)
        print("SOLUTION DE BASE INITIALE")
        print("="*70)
        print(f"Variables hors-base (VHB): {', '.join(self.vhb)} = 0")
        print(f"Variables dans la base (VDB): {', '.join(self.vdb)}")
        print("Z = 0")
        
        # Iterate until optimal
        while self.perform_iteration():
            pass
        
        # Display solution
        self.display_solution()

# Run the algorithm
if __name__ == "__main__":
    simplex = SimplexAlgorithm()
    simplex.solve()
