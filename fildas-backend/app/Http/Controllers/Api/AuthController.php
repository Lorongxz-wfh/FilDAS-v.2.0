<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\LogsActivityTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\User;

class AuthController extends Controller
{
    use LogsActivityTrait;

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with(['role', 'office'])
            ->where('email', $credentials['email'])
            ->whereNull('deleted_at')
            ->first();


        Log::info('Login debug', [
            'email_input' => $credentials['email'],
            'user_found' => !!$user,
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'password_match' => $user ? Hash::check($credentials['password'], $user->password) : false,
            'deleted_at' => $user?->deleted_at,
            'disabled_at' => $user?->disabled_at,
        ]);

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            $this->logActivity('auth.login_failed', 'Failed login attempt', null, null, [
                'email'  => $credentials['email'],
                'reason' => ! $user ? 'user_not_found' : 'invalid_password',
            ]);
            return response()->json([
                'message' => 'Invalid credentials',
            ], 422);
        }


        if ($user->disabled_at) {
            return response()->json([
                'message' => 'Account is disabled.',
            ], 403);
        }

        // If 2FA is enabled and confirmed
        if ($user->two_factor_confirmed_at) {
            $challengeId = Str::random(60);
            // Store user_id in cache for 5 minutes
            \Illuminate\Support\Facades\Cache::put('2fa_challenge_' . $challengeId, $user->id, 300);

            return response()->json([
                'two_factor_required' => true,
                'challenge_id'        => $challengeId,
            ]);
        }

        return $this->issueToken($user);
    }

    /**
     * Handle 2FA login challenge.
     */
    public function loginTwoFactor(Request $request)
    {
        $data = $request->validate([
            'challenge_id' => 'required|string',
            'code'         => 'nullable|string',
            'recovery_code' => 'nullable|string',
        ]);

        $userId = \Illuminate\Support\Facades\Cache::get('2fa_challenge_' . $data['challenge_id']);

        if (!$userId) {
            return response()->json(['message' => 'The 2FA session has expired.'], 422);
        }

        $user = User::with(['role', 'office'])->find($userId);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 422);
        }

        $valid = false;

        if ($data['recovery_code']) {
            // Check recovery codes
            $codes = json_decode(decrypt($user->two_factor_recovery_codes), true);
            foreach ($codes as $index => $code) {
                if ($code === $data['recovery_code']) {
                    unset($codes[$index]);
                    $user->two_factor_recovery_codes = encrypt(json_encode(array_values($codes)));
                    $user->save();
                    $valid = true;
                    break;
                }
            }
        } else if ($data['code']) {
            // Check TOTP code
            $google2fa = new \PragmaRX\Google2FA\Google2FA();
            $valid = $google2fa->verifyKey($user->two_factor_secret, $data['code']);
        }

        if (!$valid) {
            return response()->json(['message' => 'Invalid verification code.'], 422);
        }

        // Success - remove challenge and issue token
        \Illuminate\Support\Facades\Cache::forget('2fa_challenge_' . $data['challenge_id']);

        return $this->issueToken($user);
    }

    private function issueToken(\App\Models\User $user)
    {
        $token = $user->createToken('api-token')->plainTextToken;
        $roleName = $user->role ? strtolower(trim($user->role->name)) : null;

        if (!$roleName) {
            return response()->json([
                'message' => 'User has no role assigned.',
            ], 403);
        }

        $this->logActivity('auth.login', 'Logged in', $user->id, $user->office_id, ['role' => $roleName]);

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'                 => $user->id,
                'full_name'          => $user->full_name,
                'first_name'         => $user->first_name,
                'middle_name'        => $user->middle_name,
                'last_name'          => $user->last_name,
                'suffix'             => $user->suffix,
                'profile_photo_path' => $user->profile_photo_path,
                'profile_photo_url'  => $user->profile_photo_url,
                'signature_url'      => $user->signature_url,
                'email'              => $user->email,
                'role'               => $roleName,
                'office'             => $user->office ? [
                    'id'   => $user->office->id,
                    'name' => $user->office->name,
                    'code' => $user->office->code,
                ] : null,
                'office_id'          => $user->office_id,
                'two_factor_enabled' => $user->two_factor_enabled,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $reason = $request->input('reason', 'manual'); // default to manual

        $this->logActivity('auth.logout', 'Logged out', $user->id, $user->office_id, [
            'reason' => $reason
        ]);

        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out',
        ]);
    }
}
