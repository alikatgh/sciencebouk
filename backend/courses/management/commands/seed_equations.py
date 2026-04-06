from django.core.management.base import BaseCommand

from courses.models import Course, Equation, Lesson


class Command(BaseCommand):
    help = "Seed the database with the 17 equations and default course"

    def handle(self, *args, **options):
        equations_data = [
            {
                "sort_order": 1,
                "title": "Pythagoras's Theorem",
                "formula": "a^2 + b^2 = c^2",
                "author": "Pythagoras",
                "year": "530 BC",
                "category": "geometry",
                "description": "The fundamental relationship between the sides of a right triangle.",
            },
            {
                "sort_order": 2,
                "title": "Logarithms",
                "formula": "\\log xy = \\log x + \\log y",
                "author": "John Napier",
                "year": "1610",
                "category": "algebra",
                "description": "Logarithms convert multiplication into addition, revolutionizing computation.",
            },
            {
                "sort_order": 3,
                "title": "Calculus",
                "formula": "\\frac{df}{dt}=\\lim_{h\\to0}\\frac{f(t+h)-f(t)}{h}",
                "author": "Newton",
                "year": "1668",
                "category": "calculus",
                "description": "The derivative measures instantaneous rate of change.",
            },
            {
                "sort_order": 4,
                "title": "Law of Gravity",
                "formula": "F=G\\frac{m_1m_2}{r^2}",
                "author": "Newton",
                "year": "1687",
                "category": "physics",
                "description": "Every mass attracts every other mass with a force proportional to their product and inversely proportional to distance squared.",
            },
            {
                "sort_order": 5,
                "title": "Wave Equation",
                "formula": "\\frac{\\partial^2 u}{\\partial t^2}=c^2\\frac{\\partial^2 u}{\\partial x^2}",
                "author": "J. d'Alembert",
                "year": "1746",
                "category": "physics",
                "description": "Describes how waves propagate through space and time.",
            },
            {
                "sort_order": 6,
                "title": "The Square Root of Minus One",
                "formula": "i^2=-1",
                "author": "Euler",
                "year": "1750",
                "category": "complex_numbers",
                "description": "The imaginary unit extends the real numbers into the complex plane.",
            },
            {
                "sort_order": 7,
                "title": "Euler's Formula for Polyhedra",
                "formula": "V-E+F=2",
                "author": "Euler",
                "year": "1751",
                "category": "topology",
                "description": "For any convex polyhedron, vertices minus edges plus faces always equals two.",
            },
            {
                "sort_order": 8,
                "title": "Normal Distribution",
                "formula": "\\Phi(x)=\\frac{1}{\\sqrt{2\\pi\\sigma}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}",
                "author": "C. F. Gauss",
                "year": "1810",
                "category": "statistics",
                "description": "The bell curve that describes how data clusters around the mean.",
            },
            {
                "sort_order": 9,
                "title": "Fourier Transform",
                "formula": "f(\\omega)=\\int_{-\\infty}^{\\infty}f(x)e^{-2\\pi i x\\omega}\\,dx",
                "author": "J. Fourier",
                "year": "1822",
                "category": "signal_processing",
                "description": "Decomposes any signal into its constituent frequencies.",
            },
            {
                "sort_order": 10,
                "title": "Navier-Stokes Equation",
                "formula": "\\rho\\left(\\frac{\\partial \\mathbf{v}}{\\partial t}+\\mathbf{v}\\cdot\\nabla\\mathbf{v}\\right)=-\\nabla p+\\nabla\\cdot\\mathbf{T}+\\mathbf{f}",
                "author": "Navier, Stokes",
                "year": "1845",
                "category": "fluid_dynamics",
                "description": "Governs the motion of fluid substances like water and air.",
            },
            {
                "sort_order": 11,
                "title": "Maxwell's Equations",
                "formula": "\\nabla\\cdot\\mathbf{E}=0,\\;\\nabla\\cdot\\mathbf{H}=0,\\;\\nabla\\times\\mathbf{E}=-\\frac{1}{c}\\frac{\\partial \\mathbf{H}}{\\partial t},\\;\\nabla\\times\\mathbf{H}=\\frac{1}{c}\\frac{\\partial \\mathbf{E}}{\\partial t}",
                "author": "J. C. Maxwell",
                "year": "1865",
                "category": "electromagnetism",
                "description": "The unified theory of electricity, magnetism, and light.",
            },
            {
                "sort_order": 12,
                "title": "Second Law of Thermodynamics",
                "formula": "dS\\ge0",
                "author": "L. Boltzmann",
                "year": "1874",
                "category": "thermodynamics",
                "description": "Entropy of an isolated system never decreases.",
            },
            {
                "sort_order": 13,
                "title": "Relativity",
                "formula": "E=mc^2",
                "author": "Einstein",
                "year": "1905",
                "category": "physics",
                "description": "Mass and energy are equivalent, connected by the speed of light squared.",
            },
            {
                "sort_order": 14,
                "title": "Schrodinger's Equation",
                "formula": "i\\hbar\\frac{\\partial}{\\partial t}\\Psi=H\\Psi",
                "author": "E. Schrodinger",
                "year": "1927",
                "category": "quantum_mechanics",
                "description": "Describes how quantum states evolve over time.",
            },
            {
                "sort_order": 15,
                "title": "Information Theory",
                "formula": "H=-\\sum p(x)\\log p(x)",
                "author": "C. Shannon",
                "year": "1949",
                "category": "information",
                "description": "Shannon entropy measures the uncertainty in a random variable.",
            },
            {
                "sort_order": 16,
                "title": "Chaos Theory",
                "formula": "x_{t+1}=r x_t(1-x_t)",
                "author": "R. May",
                "year": "1975",
                "category": "dynamical_systems",
                "description": "The logistic map shows how simple rules create complex, unpredictable behavior.",
            },
            {
                "sort_order": 17,
                "title": "Black-Scholes Equation",
                "formula": "\\frac{1}{2}\\sigma^2S^2\\frac{\\partial^2V}{\\partial S^2}+rS\\frac{\\partial V}{\\partial S}+\\frac{\\partial V}{\\partial t}-rV=0",
                "author": "Black, Scholes",
                "year": "1973",
                "category": "finance",
                "description": "Determines the fair price of financial options.",
            },
        ]

        for eq_data in equations_data:
            Equation.objects.update_or_create(
                sort_order=eq_data["sort_order"],
                defaults=eq_data,
            )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(equations_data)} equations"))

        course, _ = Course.objects.update_or_create(
            slug="equations-that-changed-the-world",
            defaults={
                "title": "The Equations That Changed the World",
                "description": "Explore 17 equations that shaped mathematics, physics, and our understanding of the universe.",
                "progress_percent": 0,
                "tone": "friendly",
            },
        )

        Lesson.objects.update_or_create(
            course=course,
            sort_order=1,
            defaults={
                "title": "Pythagoras's Theorem",
                "objective": "Show that the two smaller square areas combine into the area on the hypotenuse.",
                "steps": [
                    "Resize the legs of a right triangle.",
                    "Watch the attached squares change area.",
                    "See that a² + b² always equals c².",
                ],
                "duration_minutes": 12,
            },
        )
        self.stdout.write(self.style.SUCCESS("Seeded course and lesson"))
