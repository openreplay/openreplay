torch_available = True
gpu_available = False
try:
    import torch
    gpu_available = torch.cuda.is_available()
except ModuleNotFoundError:
    torch_available = False

