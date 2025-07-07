'use client';

import { useRouter } from 'next/navigation';
import { IoIosArrowBack } from 'react-icons/io';

const BackButton = () => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="absolute top-4 left-4 z-10 flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
    >
      <IoIosArrowBack className="h-6 w-6" />
      <span>Back</span>
    </button>
  );
};

export default BackButton;
