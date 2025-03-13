"use client";

import { useAuth } from '@/functions/auth/useAuth';
import { useEffect } from 'react';
import { User } from '@prisma/client';
import { useState } from 'react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Bell, User as UserIcon, Menu } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ModeToggle } from '../theme/theme-button';

const Navbar = () => {
  const { isSessionValid, getProfile, logout } = useAuth();
  const [notifications, setNotifications] = useState(2);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    setIsAuthenticated(isSessionValid());
    const fetchUser = async () => {
      const profile = await getProfile();
      setUser(profile);
    };
    if (isAuthenticated) fetchUser();
  }, []);
  return (
    <>
      <div className="flex justify-between  items-center py-4 px-4 md:px-10 shadow-xl shadow-accent">
        <div className="flex items-center md:gap-[100px] justify-between ">
          <div>
            <p className="text-md   md:text-2xl hidden md:flex font-bold">
              <Link href={'/'}>Presence GO</Link>
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Button variant="ghost" className="cursor-pointer">
              <Link href={'/'}>Accueil</Link>
            </Button>
            <Button variant="ghost" className="cursor-pointer">
              <Link href={'/'}>À propos</Link>
            </Button>
            <Button variant="ghost" className="cursor-pointer">
              <Link href={'/'}>Contacts</Link>
            </Button>
          </div>
          <div className="md:hidden">
            <Button
              variant="ghost"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
        <p className="text-md  md:hidden font-bold">Presence GO</p>
        <div className="flex gap-2">
          {!isAuthenticated ? (
            <Button variant="ghost" className="hidden md:flex cursor-pointer">
              <Link href={'/'}>Connexion</Link>
            </Button>
          ) : (
            <Button variant="ghost" className="hidden md:flex cursor-pointer">
              <UserIcon size={25} className="cursor-pointer w-5 h-5" />
            </Button>
          )}
          {
            <Button variant={'ghost'} className="relative cursor-pointer">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 text-xs px-1"
                >
                  {notifications}
                </Badge>
              )}
            </Button>
          }
          <ModeToggle  />
        </div>
      </div>
      {isMobileMenuOpen && (
        <div className="fixed h-[40%] inset-0  bg-black/30 backdrop-blur-md flex flex-col items-center justify-center p-4 space-y-4 md:hidden  ">
          <Button variant="ghost" className="w-full text-lg">
            <Link href={'/'}>Accueil</Link>
          </Button>
          <Button variant="ghost" className="w-full text-lg">
            <Link href={'/'}>À propos</Link>
          </Button>
          <Button variant="ghost" className="w-full text-lg">
            <Link href={'/'}>Contacts</Link>
          </Button>
        </div>
      )}
    </>
  );
};

export default Navbar;
