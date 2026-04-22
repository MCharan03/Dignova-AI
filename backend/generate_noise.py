import zlib
import struct
import random

def create_noise_png(file_path, width=128, height=128):
    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    # Width, Height, Bit depth (8), Color type (0: grayscale), Compression, Filter, Interlace
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0)
    ihdr_chunk = b'IHDR' + ihdr_data
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + ihdr_chunk + struct.pack('>I', zlib.crc32(ihdr_chunk) & 0xffffffff)
    
    # IDAT chunk (pixel data)
    # Each row starts with a filter byte (0)
    pixels = []
    for _ in range(height):
        pixels.append(0) # Filter type 0
        for _ in range(width):
            pixels.append(random.randint(0, 255))
    
    idat_data = zlib.compress(bytes(pixels))
    idat_chunk = b'IDAT' + idat_data
    idat_chunk = struct.pack('>I', len(idat_data)) + idat_chunk + struct.pack('>I', zlib.crc32(idat_chunk) & 0xffffffff)
    
    # IEND chunk
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    
    with open(file_path, 'wb') as f:
        f.write(png_signature + ihdr_chunk + idat_chunk + iend_chunk)

if __name__ == "__main__":
    import os
    target_dir = os.path.join('frontend', 'public')
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
    create_noise_png(os.path.join(target_dir, 'noise.png'))
    print("noise.png generated successfully.")
