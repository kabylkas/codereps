import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import * as authApi from "../api/auth";

const POSITIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Lecturer",
  "Senior Lecturer",
  "Instructor",
  "Adjunct Faculty",
  "Department Chair",
  "Lab Instructor",
  "Teaching Assistant",
  "Graduate TA",
];

const ALL_INTERESTS = [
  "Basketball",
  "Soccer",
  "Swimming",
  "Hiking",
  "Cooking",
  "Baking",
  "Photography",
  "Music",
  "Guitar",
  "Piano",
  "Drawing",
  "Painting",
  "Reading",
  "Writing",
  "Gaming",
  "Fitness",
  "Yoga",
  "Dancing",
  "Traveling",
  "Camping",
  "Fishing",
  "Gardening",
  "Skateboarding",
  "Cycling",
  "Running",
  "Movies",
  "Anime",
  "Chess",
  "Board Games",
  "Volunteering",
  "Fashion",
  "Pottery",
  "Woodworking",
  "Astronomy",
  "Coffee",
  "Pets",
  "Martial Arts",
  "Snowboarding",
  "Surfing",
  "Rock Climbing",
];

function pickRandom(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [position, setPosition] = useState(user?.position || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Interests state (students only)
  const [interests, setInterests] = useState<string[]>([]);
  const [interestsMsg, setInterestsMsg] = useState("");
  const [interestsErr, setInterestsErr] = useState("");
  const [interestsLoading, setInterestsLoading] = useState(false);
  const interestsInitialized = useRef(false);

  useEffect(() => {
    if (user?.role === "student" && !interestsInitialized.current) {
      interestsInitialized.current = true;
      if (user.interests && user.interests.length > 0) {
        setInterests(user.interests);
      } else {
        // Randomly populate with 5-10 interests
        const count = Math.floor(Math.random() * 6) + 5;
        const randomInterests = pickRandom(ALL_INTERESTS, count);
        setInterests(randomInterests);
        // Auto-save the random interests
        authApi.updateProfile({ interests: randomInterests }).then(() => refreshUser());
      }
    }
  }, [user]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const interestsDirty = (() => {
    const saved = user?.interests || [];
    if (interests.length !== saved.length) return true;
    const sortedA = [...interests].sort();
    const sortedB = [...saved].sort();
    return sortedA.some((v, i) => v !== sortedB[i]);
  })();

  const handleInterestsSave = async () => {
    setInterestsMsg("");
    setInterestsErr("");
    setInterestsLoading(true);
    try {
      await authApi.updateProfile({ interests });
      await refreshUser();
      setInterestsMsg("Interests updated.");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setInterestsErr(axiosErr.response?.data?.detail || "Failed to update interests");
    } finally {
      setInterestsLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setProfileLoading(true);
    try {
      await authApi.updateProfile({
        full_name: fullName,
        email,
        position: position || undefined,
      });
      await refreshUser();
      setProfileMsg("Profile updated.");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setProfileErr(axiosErr.response?.data?.detail || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    setPwErr("");
    if (newPassword !== confirmPassword) {
      setPwErr("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwErr("New password must be at least 6 characters.");
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setPwErr(axiosErr.response?.data?.detail || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  const profileDirty =
    fullName !== user?.full_name ||
    email !== user?.email ||
    (position || "") !== (user?.position || "");

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text-primary">Profile</h1>
        <p className="text-text-tertiary text-sm mt-1">Manage your account details.</p>
      </div>

      {/* Avatar + role badge */}
      <div className="rounded-xl border border-border bg-surface p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-lime flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-2xl text-[#FDFAF5]">
            {user?.full_name?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-display font-bold text-lg text-text-primary">{user?.full_name}</p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono font-medium bg-lime-dim text-lime px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {user?.role}
            </span>
            {user?.position && (
              <span className="text-[10px] font-medium bg-surface-2 text-text-tertiary px-2.5 py-0.5 rounded-full">
                {user.position}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Profile details form */}
      <div className="rounded-xl border border-border bg-surface p-6 mb-6">
        <h2 className="font-display font-bold text-base text-text-primary mb-5">Personal Information</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          {profileErr && (
            <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
              <p className="text-error text-sm">{profileErr}</p>
            </div>
          )}
          {profileMsg && (
            <div className="bg-success-dim border border-success/20 rounded-lg px-4 py-3 animate-fade-in">
              <p className="text-success text-sm">{profileMsg}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-base border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-base border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              required
            />
          </div>

          {user?.role !== "student" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-base border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors cursor-pointer"
              >
                <option value="">Select your position...</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileLoading || !profileDirty}
              className="bg-lime text-[#FDFAF5] px-6 py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200"
            >
              {profileLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Interests section (students only) */}
      {user?.role === "student" && (
        <div className="rounded-xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-display font-bold text-base text-text-primary mb-2">Interests</h2>
          <p className="text-text-tertiary text-sm mb-5">Select topics you're interested in. This helps us personalize your experience.</p>

          {interestsErr && (
            <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 mb-4 animate-fade-in">
              <p className="text-error text-sm">{interestsErr}</p>
            </div>
          )}
          {interestsMsg && (
            <div className="bg-success-dim border border-success/20 rounded-lg px-4 py-3 mb-4 animate-fade-in">
              <p className="text-success text-sm">{interestsMsg}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-5">
            {ALL_INTERESTS.map((interest) => {
              const selected = interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer ${
                    selected
                      ? "bg-lime/15 border-lime text-lime"
                      : "bg-base border-border text-text-tertiary hover:border-text-secondary hover:text-text-secondary"
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleInterestsSave}
            disabled={interestsLoading || !interestsDirty}
            className="bg-lime text-[#FDFAF5] px-6 py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200"
          >
            {interestsLoading ? "Saving..." : "Save Interests"}
          </button>
        </div>
      )}

      {/* Change password form */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display font-bold text-base text-text-primary mb-5">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {pwErr && (
            <div className="bg-error-dim border border-error/20 rounded-lg px-4 py-3 animate-fade-in">
              <p className="text-error text-sm">{pwErr}</p>
            </div>
          )}
          {pwMsg && (
            <div className="bg-success-dim border border-success/20 rounded-lg px-4 py-3 animate-fade-in">
              <p className="text-success text-sm">{pwMsg}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-base border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
              placeholder="Enter current password"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-base border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-base border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime/30 transition-colors"
                placeholder="Repeat new password"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
              className="bg-lime text-[#FDFAF5] px-6 py-3 rounded-lg text-sm font-bold hover:bg-lime-hover disabled:opacity-50 transition-all duration-200"
            >
              {pwLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
