from core.model_handler import Recommendations
from utils import pg_client
import asyncio


async def main():
    await pg_client.init()
    R = Recommendations()
    R.to_download = [('****************************************************************-RecModel', 1)]
    await R.download_next()
    L = R.get_recommendations(000000000, 000000000)
    print(L)


if __name__ == '__main__':
    asyncio.run(main())
