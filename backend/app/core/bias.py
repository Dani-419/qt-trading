"""
Bias calculator — Standard ICT rules (Option 2).
Works for both cycle-level and daily-level bias.
"""


def compute_bias(h1: float, l1: float, c1: float, h2: float, l2: float) -> str:
    """
    Compute bias from the two prior periods.
    h1, l1, c1 = high, low, close of most recent completed period
    h2, l2     = high, low of period before that
    Returns: 'Bullish', 'Bearish', or 'No Bias'
    """
    if c1 > h2:
        return "Bullish"
    if c1 < l2:
        return "Bearish"
    if h1 > h2 and l1 > l2:
        return "Bullish"
    if h1 < h2 and l1 < l2:
        return "Bearish"
    return "No Bias"
